from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    display_name = Column(String(50), default="小小探险家")
    avatar = Column(String(50), default="default")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    progress = relationship("UserProgress", back_populates="user", uselist=False, cascade="all, delete-orphan")
    char_records = relationship("CharRecord", back_populates="user", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    save_backup = relationship("SaveBackup", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserProgress(Base):
    """用户整体进度"""
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_level = Column(Integer, default=1)
    max_level = Column(Integer, default=1)
    total_stars = Column(Integer, default=0)
    total_score = Column(Integer, default=0)

    # 火车系统
    unlocked_trains = Column(JSON, default=lambda: ["steam"])
    current_train_id = Column(String(20), default="steam")
    unlocked_parts = Column(JSON, default=list)
    equipped_parts = Column(JSON, default=list)

    # 打卡系统
    daily_streak = Column(Integer, default=0)
    last_play_date = Column(String(10), nullable=True)
    check_in_dates = Column(JSON, default=list)

    # 学习计划
    priority_list = Column(JSON, default=list)     # 优先学习的字
    skipped_chars = Column(JSON, default=list)      # 跳过的字
    custom_configs = Column(JSON, default=dict)     # 自定义字配置

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="progress")


class CharRecord(Base):
    """单字学习记录"""
    __tablename__ = "char_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    char = Column(String(4), nullable=False, index=True)

    status = Column(String(20), default="new")  # new, learning, familiar, mastered
    level = Column(Integer, default=0)           # 0-5 熟练度
    correct = Column(Integer, default=0)
    wrong = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    next_review_time = Column(Float, default=0)  # 时间戳
    last_time = Column(Float, default=0)

    user = relationship("User", back_populates="char_records")

    __table_args__ = (
        UniqueConstraint('user_id', 'char', name='uq_user_char'),
    )


class GameSession(Base):
    """游戏会话记录（用于数据分析）"""
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    level_id = Column(String(20), nullable=False)
    score = Column(Integer, default=0)
    stars = Column(Integer, default=0)
    accuracy = Column(Float, default=0)
    duration_seconds = Column(Integer, default=0)
    chars_learned = Column(JSON, default=list)    # ["一", "二", "三"]
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="game_sessions")


class UserAchievement(Base):
    """用户已解锁成就"""
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(String(50), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")

    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )


class UserSettings(Base):
    """用户设置"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    show_pinyin = Column(Boolean, default=True)
    show_hanzi = Column(Boolean, default=True)
    bgm_volume = Column(Float, default=0.3)
    sfx_volume = Column(Float, default=1.0)
    has_seen_tutorial = Column(Boolean, default=False)

    user = relationship("User", back_populates="settings")


class SaveBackup(Base):
    """存档备份（兼容旧的整体同步）"""
    __tablename__ = "save_backups"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    save_data = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="save_backup")


class LearningHistory(Base):
    """每日学习统计"""
    __tablename__ = "learning_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    chars_count = Column(Integer, default=0)
    sessions_count = Column(Integer, default=0)
    total_score = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='uq_user_date'),
    )