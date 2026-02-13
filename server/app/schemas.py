from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ==================== Auth ====================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4, max_length=100)
    display_name: Optional[str] = "小小探险家"


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class UserProfile(BaseModel):
    id: int
    username: str
    display_name: str
    avatar: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Progress ====================

class ProgressResponse(BaseModel):
    current_level: int = 1
    max_level: int = 1
    total_stars: int = 0
    total_score: int = 0
    unlocked_trains: List[str] = ["steam"]
    current_train_id: str = "steam"
    unlocked_parts: List[str] = []
    equipped_parts: List[str] = []
    daily_streak: int = 0
    last_play_date: Optional[str] = None
    check_in_dates: List[str] = []
    priority_list: List[str] = []
    skipped_chars: List[str] = []
    custom_configs: Dict = {}


class ProgressUpdate(BaseModel):
    """通关后提交"""
    level_id: str
    stars: int = Field(..., ge=0, le=3)
    score: int = Field(..., ge=0)


class TrainEquip(BaseModel):
    train_id: str


class PartsEquip(BaseModel):
    parts: List[str]


class PriorityUpdate(BaseModel):
    action: str  # "add" or "remove"
    char: str


class SkipUpdate(BaseModel):
    action: str  # "add" or "remove"
    char: str


class CustomConfigUpdate(BaseModel):
    char: str
    distractors: List[str] = []


# ==================== Char Records ====================

class CharRecordResponse(BaseModel):
    char: str
    status: str
    level: int
    correct: int
    wrong: int
    streak: int
    next_review_time: float
    last_time: float

    class Config:
        from_attributes = True


class CharBatchUpdate(BaseModel):
    """一局游戏结束后批量更新"""
    results: List[Dict]  # [{"char": "一", "isCorrect": true}, ...]


class ReviewListResponse(BaseModel):
    chars: List[str]


# ==================== Game Session ====================

class GameSessionCreate(BaseModel):
    level_id: str
    score: int
    stars: int
    accuracy: float = 0
    duration_seconds: int = 0
    chars_learned: List[str] = []
    char_results: List[Dict] = []  # [{"char": "一", "isCorrect": true}]


class GameSessionResponse(BaseModel):
    id: int
    level_id: str
    score: int
    stars: int
    accuracy: float
    chars_learned: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Achievement ====================

class AchievementResponse(BaseModel):
    achievement_id: str
    unlocked_at: datetime

    class Config:
        from_attributes = True


class AchievementCheck(BaseModel):
    """前端触发成就检查时携带的上下文"""
    streak: Optional[int] = 0


# ==================== Story / AI ====================

class StoryRequest(BaseModel):
    known_chars: List[str]


class StoryResponse(BaseModel):
    title: str
    content: str
    audio_url: Optional[str] = None


class ScenarioRequest(BaseModel):
    level: int
    chars: List[str]


class ScenarioDialog(BaseModel):
    role: str
    name: str
    text: str
    emotion: str = "normal"
    audio_url: Optional[str] = None


class ScenarioResponse(BaseModel):
    background: str = "bg-blue-500"
    dialogs: List[ScenarioDialog] = []


# ==================== TTS ====================

class CharCreateRequest(BaseModel):
    char: str
    example: str = ""
    distractors: List[str] = []


class CharCreateResponse(BaseModel):
    id: str
    char: str
    pinyin: str
    example: str
    confusingChars: Dict
    audio_char: str
    audio_quest: str
    isCustom: bool = True


# ==================== Settings ====================

class SettingsUpdate(BaseModel):
    show_pinyin: Optional[bool] = None
    show_hanzi: Optional[bool] = None
    bgm_volume: Optional[float] = None
    sfx_volume: Optional[float] = None
    has_seen_tutorial: Optional[bool] = None


class SettingsResponse(BaseModel):
    show_pinyin: bool = True
    show_hanzi: bool = True
    bgm_volume: float = 0.3
    sfx_volume: float = 1.0
    has_seen_tutorial: bool = False

    class Config:
        from_attributes = True


# ==================== Save Backup ====================

class SaveUpload(BaseModel):
    data: str


class SaveDownload(BaseModel):
    data: str
    updated_at: Optional[datetime] = None


# ==================== Learning History ====================

class LearningHistoryResponse(BaseModel):
    date: str
    chars_count: int
    sessions_count: int
    total_score: int


# ==================== Parent Dashboard ====================

class ParentDashboard(BaseModel):
    total_chars: int
    mastered_chars: int
    learning_chars: int
    max_level: int
    total_stars: int
    daily_streak: int
    recent_history: List[LearningHistoryResponse]
    weak_chars: List[CharRecordResponse]  # 错误率高的字