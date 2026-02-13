from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, get_optional_user
from ..models import User, UserProgress, CharRecord, GameSession
from ..schemas import GameSessionCreate, GameSessionResponse
from ..services.level_generator import get_level_config, generate_level, get_chars_index

router = APIRouter(prefix="/api/game", tags=["游戏"])


@router.get("/level/{level_id}")
def get_level(
    level_id: int,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    获取关卡配置
    - 如果有预配置关卡，直接返回
    - 如果没有，根据用户进度自动生成
    """
    # 1. 先查预配置
    config = get_level_config(level_id)
    if config:
        return config

    # 2. 自动生成
    mastered = []
    priority = []
    skipped = []

    if user:
        # 查询已掌握的字
        records = db.query(CharRecord).filter(
            CharRecord.user_id == user.id,
            CharRecord.level >= 4,
        ).all()
        mastered = [r.char for r in records]

        progress = db.query(UserProgress).filter(UserProgress.user_id == user.id).first()
        if progress:
            priority = progress.priority_list or []
            skipped = progress.skipped_chars or []

    return generate_level(level_id, mastered, priority, skipped)


@router.get("/chars-index")
def get_chars_index_api():
    """获取汉字索引（前端选项池用）"""
    return get_chars_index()


@router.post("/session", response_model=GameSessionResponse)
def create_session(
    data: GameSessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """记录一次游戏会话"""
    session = GameSession(
        user_id=user.id,
        level_id=data.level_id,
        score=data.score,
        stars=data.stars,
        accuracy=data.accuracy,
        duration_seconds=data.duration_seconds,
        chars_learned=data.chars_learned,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/history", response_model=list[GameSessionResponse])
def get_game_history(
    limit: int = Query(20, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取游戏历史"""
    sessions = (
        db.query(GameSession)
        .filter(GameSession.user_id == user.id)
        .order_by(GameSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return sessions