"""汉字小火车 - 后端入口"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import init_db
from app.routers import auth, game, progress, story, tts, parent

# --- 创建 App ---
app = FastAPI(
    title="汉字小火车 API",
    description="儿童识字游戏后端服务",
    version="2.0.0",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 静态文件 ---
os.makedirs("static/audio", exist_ok=True)
os.makedirs("static/audio/scenario", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- 注册路由 ---
app.include_router(auth.router)
app.include_router(game.router)
app.include_router(progress.router)
app.include_router(story.router)
app.include_router(tts.router)
app.include_router(parent.router)


# --- 健康检查 ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


# --- 启动事件 ---
@app.on_event("startup")
def on_startup():
    init_db()
    print("✅ Database initialized")
    print(f"✅ Server running on {settings.HOST}:{settings.PORT}")


# --- 入口 ---
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )