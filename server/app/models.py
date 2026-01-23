from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, JSON
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    updated_at = Column(String, nullable=True)

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    char = Column(String(1), unique=True, index=True)
    pinyin = Column(String)
    level = Column(Integer)
    example = Column(String)
    confusing_chars = Column(JSON, default=[])

class Word(Base):
    __tablename__ = "words"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, unique=True, index=True)
    length = Column(Integer)
    chars_json = Column(JSON)

class UserProgress(Base):
    __tablename__ = "user_progress"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    current_level = Column(Integer, default=1)
    total_stars = Column(Integer, default=0)
    mastered_chars = Column(JSON, default={})

class CustomPlan(Base):
    __tablename__ = "custom_plans"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    target_level = Column(Integer)
    chars_json = Column(JSON)
    is_used = Column(Boolean, default=False)

class LevelHistory(Base):
    __tablename__ = "level_history"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    level_id = Column(Integer)
    content_json = Column(JSON)