from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt

import hashlib
import json
import os
import edge_tts
import asyncio
from pypinyin import pinyin, Style


# 音频存储目录 (需要前端能访问)
# 假设前端 public/audio/story_gen 是静态目录
# 这里我们需要把文件存在前端的 public 目录下，或者由后端提供静态文件服务
# 为了简单，我们让后端提供静态服务 /static/audio
AUDIO_OUTPUT_DIR = "static/audio"
if not os.path.exists(AUDIO_OUTPUT_DIR):
    os.makedirs(AUDIO_OUTPUT_DIR)

# 挂载静态目录
from fastapi.staticfiles import StaticFiles


# --- 配置 ---
SECRET_KEY = "SECRET_KEY_PLEASE_CHANGE_THIS_IN_PROD" # 密钥
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60 # 30天过期

# --- 数据库 (SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Models (数据库表) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    # 存档数据 (直接存 JSON 字符串)
    save_data = Column(Text, nullable=True)
    updated_at = Column(String, nullable=True) # 上次同步时间

Base.metadata.create_all(bind=engine)

# --- Schemas (Pydantic 数据验证) ---
class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SaveData(BaseModel):
    data: str # JSON string

# --- 工具函数 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- 核心鉴权逻辑 ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- App 初始化 ---
app = FastAPI()

# 允许前端跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生产环境请改为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 挂载静态目录
app.mount("/static", StaticFiles(directory="static"), name="static")
# --- 路由 ---

@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username, 
        "last_sync": current_user.updated_at
    }

class SaveDataSchema(BaseModel):
    data: str # JSON 字符串

@app.post("/sync/upload")
def upload_save(save: SaveDataSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 更新用户的存档数据
    current_user.save_data = save.data
    current_user.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return {"status": "success", "updated_at": current_user.updated_at}

@app.get("/sync/download")
def download_save(current_user: User = Depends(get_current_user)):
    if not current_user.save_data:
        raise HTTPException(status_code=404, detail="No save data found")
    return {
        "data": current_user.save_data,
        "updated_at": current_user.updated_at
    }

class StoryRequest(BaseModel):
    known_chars: list[str] # ["人", "口", "手"...]



# 配置 Ollama
OLLAMA_API_URL = "http://192.168.220.1:11434/api/generate"
# 请根据你本地部署的模型名修改，例如 "qwen:7b", "qwen2.5:1.5b" 等
OLLAMA_MODEL = "qwen:latest" 
import requests

@app.post("/story/generate")
async def generate_story(req: StoryRequest, current_user: User = Depends(get_current_user)):
    chars = req.known_chars
    if len(chars) < 5:
        # 为了演示，如果字太少，我们强制补几个字，或者直接返回
        # return {"title": "字太少啦", "content": "请先去闯关多学几个字吧！"}
        chars = ["人", "口", "手", "天", "地", "大", "小"] # 兜底词库

    # 构造 Prompt
    # 这里的 Prompt Engineering 很关键
    prompt = f"""
    你是一位儿童文学作家。请仅使用以下汉字列表中的字，编写一个有趣的、逻辑通顺的超短故事（50字以内）。
    允许使用的汉字：{', '.join(chars)}。
    
    规则：
    1. 严禁使用列表中没有的汉字！如果实在需要连接词，请用拼音代替或者省略。
    2. 标点符号可以使用。
    3. 故事要有简单的起承转合。
    4. 直接输出故事内容，不要标题，不要解释，不要说"好的"。
    """

    try:
        # 调用 Ollama
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False # 关闭流式，一次性返回
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        
        result = response.json()
        content = result.get("response", "").strip()
        
        # 简单的标题生成 (取前几个字)
        title = "我的故事"
        if len(content) > 0:
             # 简单的后处理：去掉可能的引号
             content = content.replace('"', '').replace("'", "")
        
        
        filename = hashlib.md5(content.encode()).hexdigest() + ".mp3"
        filepath = os.path.join(AUDIO_OUTPUT_DIR, filename)
        
        # 2. 如果文件不存在，调用 Edge-TTS 生成
        if not os.path.exists(filepath):
            try:
                communicate = edge_tts.Communicate(content, "zh-CN-XiaoxiaoNeural")
                await communicate.save(filepath)
            except Exception as e:
                print(f"TTS Error: {e}")
                # 如果失败，前端可以回退到浏览器TTS
                return {"title": title, "content": content, "audio_url": None}

        # 3. 返回音频 URL
        # 假设后端运行在 localhost:8000
        audio_url = f"http://localhost:8000/static/audio/{filename}"
        
        return {
            "title": title, 
            "content": content,
            "audio_url": audio_url
        }

    except Exception as e:
        print(f"Ollama Error: {e}")
        # 降级回 Mock 数据
        return {
            "title": "系统繁忙", 
            "content": f"AI 正在休息，这是备用故事：{''.join(chars[:5])}是好朋友。"
        }


# 更新请求模型
class CharCreateRequest(BaseModel):
    char: str
    example: str = ""
    distractors: list[str] = []

@app.post("/char/create")
async def create_custom_char(req: CharCreateRequest): 
    # req: { "char": "赢" }
    char = req.char
    if not char: return {"error": "No char"}
    
    # 1. 生成拼音
    py = pinyin(char, style=Style.TONE, heteronym=False)[0][0]
    
    

    # 2. 生成音频 (单字 + 题目)
    # 文件名用 md5(char) 避免编码问题
    char_hash = hashlib.md5(char.encode()).hexdigest()
    file_char = os.path.join(AUDIO_OUTPUT_DIR, f"{char_hash}.mp3")
    file_quest = os.path.join(AUDIO_OUTPUT_DIR, f"{char_hash}_q.mp3")
    
    base_url = "http://localhost:8000/static/audio"
    
    if not os.path.exists(file_char):
        comm = edge_tts.Communicate(char, "zh-CN-XiaoxiaoNeural")
        await comm.save(file_char)
        
    if not os.path.exists(file_quest):
        text = f"请找出 {py}，{req.example}的{char}" if req.example else f"请找出 {py}，{char}"
        comm = edge_tts.Communicate(text, "zh-CN-XiaoxiaoNeural")
        await comm.save(file_quest)
        
    return {
        "id": f"custom_{char_hash}",
        "char": char,
        "pinyin": py,
        "example": req.example,
        "confusingChars": {"hard": req.distractors}, # 存入干扰项
        "audio_char": f"{base_url}/{char_hash}.mp3",
        "audio_quest": f"{base_url}/{char_hash}_q.mp3",
        "isCustom": True
    }


class ScenarioRequest(BaseModel):
    level: int
    chars: list[str] # 本关要学的字

@app.post("/story/scenario")
async def generate_scenario(req: ScenarioRequest, current_user: User = Depends(get_current_user)):
    chars_str = "、".join(req.chars)
    
    # 强化 Prompt，要求 AI 必须返回纯 JSON
    prompt = f"""
    请为儿童识字游戏设计一段剧情对话（3句）。
    
    【任务信息】
    当前关卡：{req.level}
    本关学习汉字：{chars_str}
    
    【剧情要求】
    1. 角色固定为“列车长”和“小朋友”（对话中只显示列车长）。
    2. 场景随机（森林、沙漠、海底、太空等）。
    3. 剧情内容必须与“学习汉字”有关。例如：遇到障碍物需要认字才能通过，或者发现了写着汉字的宝藏。
    4. 必须包含本关的汉字。
    5. 情感可以是 happy, worry, shock, normal。
    
    【输出格式】
    必须是严格的 JSON 格式，不要包含 Markdown 代码块。
    结构示例：
    {{
      "background": "bg-green-600",
      "dialogs": [
        {{ "role": "conductor", "name": "列车长", "text": "这里填第一句话...", "emotion": "happy" }},
        {{ "role": "conductor", "name": "列车长", "text": "这里填第二句话...", "emotion": "normal" }}
      ]
    }}
    
    请根据【任务信息】编写全新的内容，不要抄袭示例！
    """
    MAX_RETRIES = 2
    for attempt in range(MAX_RETRIES):
        try:
            # 1. 调用 Ollama
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json" # [优化] 强制 Ollama 返回 JSON 模式 (如果模型支持)
            }
            
            print("Calling Ollama for scenario...")
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            raw_content = result.get("response", "").strip()
            print(f"Ollama Raw: {raw_content}")

            # 2. 清洗与解析 JSON
            # 有时候 AI 会加 ```json ... ```，需要去掉
            if raw_content.startswith("```json"):
                raw_content = raw_content.replace("```json", "").replace("```", "")
            
            scenario = json.loads(raw_content)
            first_text = scenario.get("dialogs", [{}])[0].get("text", "")
            if "对话内容" in first_text or "这里填" in first_text:
                print("AI copied example, retrying or using mock...")
                # 这里可以抛出异常触发重试，或者手动构造一个备用剧情
                raise ValueError("AI output invalid")
            # 3. [Day5/10 补全] 生成音频
            # 遍历 dialogs，生成每一句的语音
            # 我们需要给前端返回一个 audio_url 字段
            
            base_url = "http://localhost:8000/static/audio/scenario"
            # 确保目录存在
            scenario_audio_dir = os.path.join("static", "audio", "scenario")
            if not os.path.exists(scenario_audio_dir):
                os.makedirs(scenario_audio_dir)

            for idx, dialog in enumerate(scenario.get("dialogs", [])):
                text = dialog.get("text", "")
                if not text: continue
                
                # 使用 md5(text) 作为文件名，避免重复生成
                text_hash = hashlib.md5(text.encode()).hexdigest()
                filename = f"{text_hash}.mp3"
                filepath = os.path.join(scenario_audio_dir, filename)
                
                if not os.path.exists(filepath):
                    print(f"Generating TTS: {text}")
                    try:
                        # 使用 Edge-TTS
                        communicate = edge_tts.Communicate(text, "zh-CN-YunxiNeural") # 男声
                        await communicate.save(filepath)
                    except Exception as e:
                        print(f"TTS Error: {e}")
                
                # 将 URL 注入到 dialog 对象中
                dialog["audio_url"] = f"{base_url}/{filename}"

            return scenario
            
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            if attempt == MAX_RETRIES - 1:
                return {} # 彻底失败



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)