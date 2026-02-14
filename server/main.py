"""汉字小火车 - 后端入口"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import init_db
from app.routers import auth, game, progress, story, tts, parent, achievements

# --- 创建 App ---
app = FastAPI(
    title="汉字小火车 API",
    description="儿童识字游戏后端服务",
    version="2.0.0",
    # 生产环境关闭文档
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
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

# --- 生产环境：挂载前端构建产物 ---
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "dist")
if settings.is_production and os.path.exists(frontend_dist):
    # 注意：这个要放在 API 路由之后
    pass  # 见下面 catch-all 路由

# --- 注册路由 ---
app.include_router(auth.router)
app.include_router(game.router)
app.include_router(progress.router)
app.include_router(story.router)
app.include_router(tts.router)
app.include_router(parent.router)
app.include_router(achievements.router)


# --- 健康检查 ---
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "env": settings.ENV,
    }


# --- 生产环境：服务前端 SPA ---
if settings.is_production and os.path.exists(frontend_dist):
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="frontend-assets")

    # 静态资源
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # SPA fallback
        return FileResponse(os.path.join(frontend_dist, "index.html"))


# --- 启动事件 ---
@app.on_event("startup")
def on_startup():
    init_db()
    print(f"✅ Database initialized ({settings.DATABASE_URL})")
    print(f"✅ Environment: {settings.ENV}")
    print(f"✅ Server running on {settings.HOST}:{settings.PORT}")
    if settings.is_production:
        print("🔒 Production mode: docs disabled")


# --- 入口 ---
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=not settings.is_production,
        workers=4 if settings.is_production else 1,
        log_level="warning" if settings.is_production else "info",
    )