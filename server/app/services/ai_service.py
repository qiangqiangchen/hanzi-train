"""Ollama AI 服务封装"""
import json
import requests
from ..config import settings


def call_ollama(prompt: str, format_json: bool = False) -> str | None:
    """
    调用 Ollama API
    Returns: 响应文本，失败返回 None
    """
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    if format_json:
        payload["format"] = "json"

    try:
        response = requests.post(
            settings.OLLAMA_API_URL,
            json=payload,
            timeout=settings.OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "").strip()
    except Exception as e:
        print(f"[Ollama Error] {e}")
        return None


def parse_json_response(raw: str) -> dict | None:
    """清洗并解析 AI 返回的 JSON"""
    if not raw:
        return None

    # 去掉 markdown 代码块
    cleaned = raw
    if cleaned.startswith("```json"):
        cleaned = cleaned.replace("```json", "").replace("```", "")
    elif cleaned.startswith("```"):
        cleaned = cleaned.replace("```", "")

    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError as e:
        print(f"[JSON Parse Error] {e}, raw: {raw[:200]}")
        return None


def generate_story_prompt(chars: list[str]) -> str:
    return f"""
    你是一位儿童文学作家。请仅使用以下汉字列表中的字，编写一个有趣的、逻辑通顺的超短故事（50字以内）。
    允许使用的汉字：{', '.join(chars)}。
    
    规则：
    1. 严禁使用列表中没有的汉字！如果实在需要连接词，请用拼音代替或者省略。
    2. 标点符号可以使用。
    3. 故事要有简单的起承转合。
    4. 直接输出故事内容，不要标题，不要解释，不要说"好的"。
    """


def generate_scenario_prompt(level: int, chars: list[str]) -> str:
    chars_str = "、".join(chars)
    return f"""
    请为儿童识字游戏设计一段剧情对话（3句）。
    
    【任务信息】
    当前关卡：{level}
    本关学习汉字：{chars_str}
    
    【剧情要求】
    1. 角色固定为"列车长"和"小朋友"（对话中只显示列车长）。
    2. 场景随机（森林、沙漠、海底、太空等）。
    3. 剧情内容必须与"学习汉字"有关。
    4. 必须包含本关的汉字。
    5. 情感可以是 happy, worry, shock, normal。
    
    【输出格式】
    必须是严格的 JSON 格式，不要包含 Markdown 代码块。
    结构示例：
    {{
      "background": "bg-green-600",
      "dialogs": [
        {{ "role": "conductor", "name": "列车长", "text": "第一句话...", "emotion": "happy" }},
        {{ "role": "conductor", "name": "列车长", "text": "第二句话...", "emotion": "normal" }}
      ]
    }}
    
    请根据【任务信息】编写全新的内容，不要抄袭示例！
    """