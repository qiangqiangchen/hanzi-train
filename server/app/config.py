from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    ENV: str = "development"

    # 安全
    SECRET_KEY: str = "SECRET_KEY_PLEASE_CHANGE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30

    # 数据库
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # Ollama
    OLLAMA_API_URL: str = "http://192.168.220.1:11434/api/generate"
    OLLAMA_MODEL: str = "qwen:latest"
    OLLAMA_TIMEOUT: int = 10

    # TTS
    TTS_VOICE: str = "zh-CN-XiaoxiaoNeural"
    TTS_VOICE_MALE: str = "zh-CN-YunxiNeural"

    # 服务
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:4173"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["*"]

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()