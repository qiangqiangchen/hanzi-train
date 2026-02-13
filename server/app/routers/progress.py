from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..database import get_db
from ..auth import get_current_user
from ..models import User, UserProgress, CharRecord, LearningHistory
from ..schemas import (
    ProgressResponse, ProgressUpdate, TrainEquip, PartsEquip,
    PriorityUpdate, SkipUpdate, CustomConfigUpdate,
    CharRecordResponse, CharBatchUpdate, ReviewListResponse,
)
from ..services.spaced_repetition import calculate_next_review

router = APIRouter(prefix="/api/progress", tags=["学习进度"])


def _get_progress(user: User, db: Session) -> UserProgress:
    progress = db.query(UserProgress).filter(UserProgress.user_id == user.id).first()
    if not progress:
        progress = UserProgress(user_id=user.id)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


@router.get("/", response_model=ProgressResponse)
def get_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """获取用户整体进度"""
    progress = _get_progress(user, db)
    return ProgressResponse(
        current_level=progress.current_level,
        max_level=progress.max_level,
        total_stars=progress.total_stars,
        total_score=progress.total_score,
        unlocked_trains=progress.unlocked_trains or ["steam"],
        current_train_id=progress.current_train_id or "steam",
        unlocked_parts=progress.unlocked_parts or [],
        equipped_parts=progress.equipped_parts or [],
        daily_streak=progress.daily_streak or 0,
        last_play_date=progress.last_play_date,
        check_in_dates=progress.check_in_dates or [],
        priority_list=progress.priority_list or [],
        skipped_chars=progress.skipped_chars or [],
        custom_configs=progress.custom_configs or {},
    )


@router.post("/update-level")
def update_level(
    data: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """通关后更新关卡进度"""
    from sqlalchemy.orm.attributes import flag_modified

    progress = _get_progress(user, db)

    level_num = int(data.level_id) if data.level_id.isdigit() else 0

    # 更新 current_level（当前正在玩的关卡）
    if level_num > 0:
        progress.current_level = level_num

    # 更新 max_level（最高解锁关卡）
    if level_num == progress.max_level and data.stars > 0:
        progress.max_level += 1

    progress.total_stars += data.stars
    progress.total_score += data.score
    progress.updated_at = datetime.utcnow()

    # 火车解锁检查
    trains = progress.unlocked_trains or ["steam"]
    trains_changed = False
    if progress.total_stars >= 20 and "diesel" not in trains:
        trains.append("diesel")
        trains_changed = True
    if progress.total_stars >= 50 and "electric" not in trains:
        trains.append("electric")
        trains_changed = True
    if trains_changed:
        progress.unlocked_trains = trains
        flag_modified(progress, "unlocked_trains")

    # 打卡逻辑
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if progress.last_play_date != today:
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        if progress.last_play_date == yesterday:
            progress.daily_streak = (progress.daily_streak or 0) + 1
        else:
            progress.daily_streak = 1
        progress.last_play_date = today

        dates = list(progress.check_in_dates or [])
        if today not in dates:
            dates.append(today)
            if len(dates) > 30:
                dates = dates[-30:]
            progress.check_in_dates = dates
            flag_modified(progress, "check_in_dates")

    # 更新每日学习统计
    history = db.query(LearningHistory).filter(
        LearningHistory.user_id == user.id,
        LearningHistory.date == today,
    ).first()
    if history:
        history.sessions_count += 1
        history.total_score += data.score
    else:
        db.add(LearningHistory(
            user_id=user.id,
            date=today,
            sessions_count=1,
            total_score=data.score,
        ))

    db.commit()
    return {
        "status": "success",
        "current_level": progress.current_level,
        "max_level": progress.max_level,
        "total_stars": progress.total_stars,
    }


@router.post("/equip-train")
def equip_train(
    data: TrainEquip,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = _get_progress(user, db)
    trains = progress.unlocked_trains or ["steam"]
    if data.train_id not in trains:
        raise HTTPException(status_code=400, detail="火车尚未解锁")
    progress.current_train_id = data.train_id
    progress.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "current_train_id": data.train_id}


@router.post("/equip-parts")
def equip_parts(
    data: PartsEquip,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm.attributes import flag_modified

    progress = _get_progress(user, db)
    if len(data.parts) > 3:
        raise HTTPException(status_code=400, detail="最多装备3个配件")
    progress.equipped_parts = data.parts
    flag_modified(progress, "equipped_parts")
    progress.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "equipped_parts": data.parts}

@router.post("/priority")
def update_priority(
    data: PriorityUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = _get_progress(user, db)
    priority = progress.priority_list or []

    if data.action == "add" and data.char not in priority:
        priority.append(data.char)
    elif data.action == "remove" and data.char in priority:
        priority.remove(data.char)

    progress.priority_list = priority
    db.commit()
    return {"status": "success", "priority_list": priority}


@router.post("/skip")
def update_skip(
    data: SkipUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = _get_progress(user, db)
    skipped = progress.skipped_chars or []

    if data.action == "add" and data.char not in skipped:
        skipped.append(data.char)
    elif data.action == "remove" and data.char in skipped:
        skipped.remove(data.char)

    progress.skipped_chars = skipped
    db.commit()
    return {"status": "success", "skipped_chars": skipped}


@router.post("/custom-config")
def update_custom_config(
    data: CustomConfigUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = _get_progress(user, db)
    configs = progress.custom_configs or {}
    configs[data.char] = {"distractors": data.distractors}
    progress.custom_configs = configs
    db.commit()
    return {"status": "success"}


# ==================== 单字记录 ====================

@router.get("/chars", response_model=list[CharRecordResponse])
def get_all_chars(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取所有学过的字"""
    records = db.query(CharRecord).filter(CharRecord.user_id == user.id).all()
    return records


@router.post("/chars/batch-update")
def batch_update_chars(
    data: CharBatchUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """一局游戏结束后批量更新单字记录"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    chars_count = 0

    for item in data.results:
        char = item.get("char")
        is_correct = item.get("isCorrect", False)
        if not char:
            continue

        record = db.query(CharRecord).filter(
            CharRecord.user_id == user.id,
            CharRecord.char == char,
        ).first()

        if not record:
            record = CharRecord(user_id=user.id, char=char)
            db.add(record)
            db.flush()

        now_ts = datetime.utcnow().timestamp() * 1000
        record.last_time = now_ts

        sr_result = calculate_next_review(record.level, is_correct)
        record.level = sr_result["level"]
        record.status = sr_result["status"]
        record.next_review_time = sr_result["next_review_time"]

        if is_correct:
            record.correct += 1
            record.streak += 1
            chars_count += 1
        else:
            record.wrong += 1
            record.streak = 0

    # 更新每日学习历史的 chars_count
    history = db.query(LearningHistory).filter(
        LearningHistory.user_id == user.id,
        LearningHistory.date == today,
    ).first()
    if history:
        history.chars_count += chars_count
    else:
        db.add(LearningHistory(
            user_id=user.id,
            date=today,
            chars_count=chars_count,
        ))

    db.commit()
    return {"status": "success", "updated": len(data.results)}


@router.get("/chars/review", response_model=ReviewListResponse)
def get_review_list(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取需要复习的字"""
    now_ts = datetime.utcnow().timestamp() * 1000
    records = db.query(CharRecord).filter(
        CharRecord.user_id == user.id,
        CharRecord.next_review_time > 0,
        CharRecord.next_review_time <= now_ts,
        CharRecord.level < 5,
    ).all()
    return ReviewListResponse(chars=[r.char for r in records])