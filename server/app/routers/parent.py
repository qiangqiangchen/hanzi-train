from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Float

from ..database import get_db
from ..auth import get_current_user
from ..models import User, UserProgress, CharRecord, LearningHistory, UserSettings, SaveBackup
from ..schemas import (
    ParentDashboard, SettingsUpdate, SettingsResponse,
    SaveUpload, SaveDownload, LearningHistoryResponse, CharRecordResponse,
)
from datetime import datetime


router = APIRouter(prefix="/api/parent", tags=["家长中心"])


@router.get("/dashboard", response_model=ParentDashboard)
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """家长仪表盘"""
    progress = db.query(UserProgress).filter(UserProgress.user_id == user.id).first()

    # 统计
    total = db.query(func.count(CharRecord.id)).filter(
        CharRecord.user_id == user.id
    ).scalar() or 0

    mastered = db.query(func.count(CharRecord.id)).filter(
        CharRecord.user_id == user.id,
        CharRecord.level >= 4
    ).scalar() or 0

    # 近7天历史
    history = (
        db.query(LearningHistory)
        .filter(LearningHistory.user_id == user.id)
        .order_by(LearningHistory.date.desc())
        .limit(7)
        .all()
    )
    history.reverse()

    # 薄弱字（错误次数 > 0，按错误率降序）
    weak = (
        db.query(CharRecord)
        .filter(
            CharRecord.user_id == user.id,
            CharRecord.wrong > 0,
            CharRecord.level < 4,  # 还没掌握的
        )
        .order_by(
            # 错误率 = wrong / (correct + wrong)，用 case 避免除以零
            (
                cast(CharRecord.wrong, Float)
                / func.nullif(CharRecord.correct + CharRecord.wrong, 0)
            ).desc()
        )
        .limit(10)
        .all()
    )

    return ParentDashboard(
        total_chars=total,
        mastered_chars=mastered,
        learning_chars=total - mastered,
        max_level=progress.max_level if progress else 1,
        total_stars=progress.total_stars if progress else 0,
        daily_streak=progress.daily_streak if progress else 0,
        recent_history=[
            LearningHistoryResponse(
                date=h.date,
                chars_count=h.chars_count,
                sessions_count=h.sessions_count,
                total_score=h.total_score,
            ) for h in history
        ],
        weak_chars=[
            CharRecordResponse(
                char=c.char,
                status=c.status,
                level=c.level,
                correct=c.correct,
                wrong=c.wrong,
                streak=c.streak,
                next_review_time=c.next_review_time,
                last_time=c.last_time,
            ) for c in weak
        ],
    )


@router.get("/settings", response_model=SettingsResponse)
def get_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.put("/settings")
def update_settings(
    data: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)
        db.flush()

    # 用 model_dump 替代已废弃的 dict
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(s, key, value)

    db.commit()
    return {"status": "success"}


@router.post("/sync/upload")
def upload_save(
    data: SaveUpload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传存档"""
    backup = db.query(SaveBackup).filter(SaveBackup.user_id == user.id).first()
    if not backup:
        backup = SaveBackup(user_id=user.id)
        db.add(backup)

    backup.save_data = data.data
    backup.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "updated_at": backup.updated_at.isoformat()}


@router.get("/sync/download", response_model=SaveDownload)
def download_save(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """下载存档"""
    backup = db.query(SaveBackup).filter(SaveBackup.user_id == user.id).first()
    if not backup or not backup.save_data:
        raise HTTPException(status_code=404, detail="No save data")
    return SaveDownload(data=backup.save_data, updated_at=backup.updated_at)