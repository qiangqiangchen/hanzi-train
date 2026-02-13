from fastapi import APIRouter
from pypinyin import pinyin, Style

from ..schemas import CharCreateRequest, CharCreateResponse
from ..services.tts_service import generate_char_audio
from ..config import settings

router = APIRouter(prefix="/api/tts", tags=["语音合成"])

BASE_URL = f"http://localhost:{settings.PORT}"


@router.post("/create-char", response_model=CharCreateResponse)
async def create_custom_char(req: CharCreateRequest):
    """为自定义汉字生成拼音和音频"""
    char = req.char
    if not char:
        return CharCreateResponse(
            id="", char="", pinyin="", example="",
            confusingChars={}, audio_char="", audio_quest="",
        )

    # 生成拼音
    py = pinyin(char, style=Style.TONE, heteronym=False)[0][0]

    # 生成音频
    import hashlib
    char_hash = hashlib.md5(char.encode()).hexdigest()
    audios = await generate_char_audio(char, py, req.example, BASE_URL)

    return CharCreateResponse(
        id=f"custom_{char_hash}",
        char=char,
        pinyin=py,
        example=req.example,
        confusingChars={"hard": req.distractors},
        audio_char=audios["audio_char"] or "",
        audio_quest=audios["audio_quest"] or "",
        isCustom=True,
    )