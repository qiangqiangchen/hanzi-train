from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models import User
from ..schemas import StoryRequest, StoryResponse, ScenarioRequest, ScenarioResponse
from ..services.ai_service import (
    call_ollama, parse_json_response,
    generate_story_prompt, generate_scenario_prompt,
)
from ..services.tts_service import generate_tts
from ..config import settings

router = APIRouter(prefix="/api/story", tags=["AI故事"])

BASE_URL = f"http://localhost:{settings.PORT}"


@router.post("/generate", response_model=StoryResponse)
async def generate_story(
    req: StoryRequest,
    user: User = Depends(get_current_user),
):
    """AI 生成阅读故事"""
    chars = req.known_chars
    if len(chars) < 5:
        chars = ["人", "口", "手", "天", "地", "大", "小"]

    try:
        prompt = generate_story_prompt(chars)
        content = call_ollama(prompt)
    except Exception as e:
        print(f"[Story] Ollama error: {e}")
        content = None

    if not content:
        # 降级：用已知字拼一个简单故事
        sample = chars[:6]
        content = f"{'、'.join(sample[:3])}和{'、'.join(sample[3:])}是好朋友。"
        return StoryResponse(title="小故事", content=content, audio_url=None)

    # 清洗
    content = content.replace('"', '').replace("'", "").strip()
    # 去掉可能的开头"好的"、"故事："等
    for prefix in ["好的，", "好的!", "故事：", "故事:", "以下是故事：", "以下是故事:"]:
        if content.startswith(prefix):
            content = content[len(prefix):].strip()

    # 生成语音
    audio_url = None
    try:
        audio_url = await generate_tts(content, base_url=BASE_URL)
    except Exception as e:
        print(f"[Story] TTS error: {e}")

    title = "我的故事"
    return StoryResponse(title=title, content=content, audio_url=audio_url)


@router.post("/scenario", response_model=ScenarioResponse)
async def generate_scenario(
    req: ScenarioRequest,
    user: User = Depends(get_current_user),
):
    """AI 生成关卡剧情"""
    MAX_RETRIES = 2

    for attempt in range(MAX_RETRIES):
        try:
            prompt = generate_scenario_prompt(req.level, req.chars)
            raw = call_ollama(prompt, format_json=True)
            scenario = parse_json_response(raw)

            if not scenario or not scenario.get("dialogs"):
                continue

            first_text = scenario.get("dialogs", [{}])[0].get("text", "")
            if "对话内容" in first_text or "这里填" in first_text:
                continue

            # 为每句话生成 TTS
            for dialog in scenario.get("dialogs", []):
                text = dialog.get("text", "")
                if text:
                    try:
                        url = await generate_tts(
                            text,
                            subdir="scenario",
                            voice=settings.TTS_VOICE_MALE,
                            base_url=BASE_URL,
                        )
                        dialog["audio_url"] = url
                    except Exception as e:
                        print(f"[Scenario] TTS error for dialog: {e}")
                        dialog["audio_url"] = None

            return ScenarioResponse(**scenario)

        except Exception as e:
            print(f"[Scenario] Attempt {attempt + 1} failed: {e}")

    # 全部失败
    return ScenarioResponse()