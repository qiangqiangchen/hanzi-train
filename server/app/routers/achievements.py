from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List

from ..database import get_db
from ..auth import get_current_user
from ..models import User, UserAchievement, UserProgress, CharRecord
from ..schemas import AchievementCheck
from sqlalchemy import func

router = APIRouter(prefix="/api/achievements", tags=["成就"])

ACHIEVEMENTS = [
    {"id": "first_blood", "condition": {"type": "level_pass", "value": 1}},
    {"id": "streak_5", "condition": {"type": "streak", "value": 5}},
    {"id": "streak_10", "condition": {"type": "streak", "value": 10}},
    {"id": "char_100", "condition": {"type": "master_chars", "value": 100}},
    {"id": "train_master", "condition": {"type": "train_count", "value": 3}},
]


@router.get("/")
def get_achievements(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取用户已解锁的成就列表"""
    records = db.query(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    return [
        {
            "achievement_id": r.achievement_id,
            "unlocked_at": r.unlocked_at.isoformat() if r.unlocked_at else None,
        }
        for r in records
    ]


@router.post("/check")
def check_achievements(
    context: AchievementCheck,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """服务端主动检查成就（备用）"""
    existing = db.query(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    existing_ids = {r.achievement_id for r in existing}

    progress = db.query(UserProgress).filter(
        UserProgress.user_id == user.id
    ).first()

    mastered_count = db.query(func.count(CharRecord.id)).filter(
        CharRecord.user_id == user.id,
        CharRecord.level >= 4,
    ).scalar() or 0

    trains_count = len(progress.unlocked_trains or ["steam"]) if progress else 1

    new_unlocked = []

    for ach in ACHIEVEMENTS:
        if ach["id"] in existing_ids:
            continue

        cond = ach["condition"]
        is_met = False

        if cond["type"] == "level_pass":
            is_met = progress and progress.max_level > cond["value"]
        elif cond["type"] == "streak":
            is_met = (context.streak or 0) >= cond["value"]
        elif cond["type"] == "master_chars":
            is_met = mastered_count >= cond["value"]
        elif cond["type"] == "train_count":
            is_met = trains_count >= cond["value"]

        if is_met:
            record = UserAchievement(
                user_id=user.id,
                achievement_id=ach["id"],
                unlocked_at=datetime.utcnow(),
            )
            db.add(record)
            new_unlocked.append(ach["id"])

    if new_unlocked:
        db.commit()

    return {"new_unlocked": new_unlocked}


class AchievementSyncRequest(BaseModel):
    achievement_ids: List[str]


@router.post("/sync")
def sync_achievements(
    data: AchievementSyncRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从前端同步成就到后端"""
    existing = db.query(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    existing_ids = {r.achievement_id for r in existing}

    added = []
    for aid in data.achievement_ids:
        if aid not in existing_ids:
            db.add(UserAchievement(
                user_id=user.id,
                achievement_id=aid,
                unlocked_at=datetime.utcnow(),
            ))
            added.append(aid)

    if added:
        db.commit()

    return {"synced": added}