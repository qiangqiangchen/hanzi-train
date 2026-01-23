from pydantic import BaseModel
from typing import List, Optional, Any

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class LevelRequest(BaseModel):
    level_id: int

class LevelResponse(BaseModel):
    level_id: int
    questions: List[Any] # 包含题目数据