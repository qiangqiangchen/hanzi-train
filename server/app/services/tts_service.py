"""Edge-TTS 语音合成服务"""
import os
import hashlib
import edge_tts
from ..config import settings

AUDIO_BASE_DIR = "static/audio"


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def get_audio_path(text: str, subdir: str = "") -> tuple[str, str]:
    """
    根据文本生成音频文件路径
    Returns: (filepath, url_path)
    """
    text_hash = hashlib.md5(text.encode()).hexdigest()
    filename = f"{text_hash}.mp3"

    if subdir:
        dir_path = os.path.join(AUDIO_BASE_DIR, subdir)
        url_path = f"/static/audio/{subdir}/{filename}"
    else:
        dir_path = AUDIO_BASE_DIR
        url_path = f"/static/audio/{filename}"

    ensure_dir(dir_path)
    filepath = os.path.join(dir_path, filename)
    return filepath, url_path


async def generate_tts(
    text: str,
    subdir: str = "",
    voice: str = None,
    base_url: str = "http://localhost:8000"
) -> str | None:
    """
    生成 TTS 音频，返回 URL
    如果文件已存在则直接返回 URL（缓存）
    """
    if not text:
        return None

    voice = voice or settings.TTS_VOICE
    filepath, url_path = get_audio_path(text, subdir)

    if not os.path.exists(filepath):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(filepath)
        except Exception as e:
            print(f"[TTS Error] {e}")
            return None

    return f"{base_url}{url_path}"


async def generate_char_audio(
    char: str,
    pinyin: str,
    example: str = "",
    base_url: str = "http://localhost:8000"
) -> dict:
    """
    为单个汉字生成两个音频：读音 + 提问语音
    Returns: {"audio_char": url, "audio_quest": url}
    """
    char_hash = hashlib.md5(char.encode()).hexdigest()

    # 单字读音
    char_filepath = os.path.join(AUDIO_BASE_DIR, f"{char_hash}.mp3")
    char_url = f"{base_url}/static/audio/{char_hash}.mp3"

    if not os.path.exists(char_filepath):
        try:
            comm = edge_tts.Communicate(char, settings.TTS_VOICE)
            await comm.save(char_filepath)
        except Exception as e:
            print(f"[TTS Char Error] {e}")
            char_url = None

    # 提问语音
    quest_text = f"请找出 {pinyin}，{example}的{char}" if example else f"请找出 {pinyin}，{char}"
    quest_filepath = os.path.join(AUDIO_BASE_DIR, f"{char_hash}_q.mp3")
    quest_url = f"{base_url}/static/audio/{char_hash}_q.mp3"

    if not os.path.exists(quest_filepath):
        try:
            comm = edge_tts.Communicate(quest_text, settings.TTS_VOICE)
            await comm.save(quest_filepath)
        except Exception as e:
            print(f"[TTS Quest Error] {e}")
            quest_url = None

    return {
        "audio_char": char_url,
        "audio_quest": quest_url,
    }