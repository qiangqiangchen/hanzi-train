"""关卡生成逻辑（从前端 game.js 的自动生成逻辑迁移）"""
import json
import os
import random


# 加载静态数据（服务器启动时加载一次）
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "data")

_chars_index = None
_levels_data = None


def _load_data():
    global _chars_index, _levels_data
    
    # 尝试从前端 src/data 加载，如果不存在则从 server/data 加载
    chars_path = os.path.join(DATA_DIR, "chars_index.json")
    levels_path = os.path.join(DATA_DIR, "levels.json")
    
    # 备用路径
    server_data = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    
    if os.path.exists(chars_path):
        with open(chars_path, "r", encoding="utf-8") as f:
            _chars_index = json.load(f)
    elif os.path.exists(os.path.join(server_data, "chars_index.json")):
        with open(os.path.join(server_data, "chars_index.json"), "r", encoding="utf-8") as f:
            _chars_index = json.load(f)
    else:
        _chars_index = []
    
    if os.path.exists(levels_path):
        with open(levels_path, "r", encoding="utf-8") as f:
            _levels_data = json.load(f)
    elif os.path.exists(os.path.join(server_data, "levels.json")):
        with open(os.path.join(server_data, "levels.json"), "r", encoding="utf-8") as f:
            _levels_data = json.load(f)
    else:
        _levels_data = []


def get_chars_index() -> list:
    if _chars_index is None:
        _load_data()
    return _chars_index


def get_levels_data() -> list:
    if _levels_data is None:
        _load_data()
    return _levels_data


def get_level_config(level_id: int) -> dict | None:
    """获取预配置的关卡，不存在则返回 None"""
    levels = get_levels_data()
    for level in levels:
        if level["levelId"] == level_id:
            return level
    return None


def generate_level(
    level_id: int,
    mastered_chars: list[str] = None,
    priority_chars: list[str] = None,
    skipped_chars: list[str] = None,
) -> dict:
    """
    自动生成关卡配置
    与前端 game.js 中 initLevel 的自动生成逻辑对应
    """
    mastered_chars = mastered_chars or []
    priority_chars = priority_chars or []
    skipped_chars = skipped_chars or []
    chars_index = get_chars_index()

    char_count = 3 if level_id <= 20 else (4 if level_id <= 50 else 5)
    option_count = 3 if level_id <= 20 else (4 if level_id <= 50 else 5)
    time_limit = 15 if level_id > 20 else 0

    target_chars = []

    # 1. 优先使用 priority_chars
    for c in priority_chars[:char_count]:
        if c not in skipped_chars:
            target_chars.append(c)

    # 2. 从字库补齐
    if len(target_chars) < char_count:
        needed = char_count - len(target_chars)
        target_level = min((level_id - 1) // 20 + 1, 5)

        pool = [
            c for c in chars_index
            if c.get("level") == target_level
            and c["char"] not in skipped_chars
            and c["char"] not in target_chars
            and c["char"] not in mastered_chars
        ]

        if not pool:
            pool = [c for c in chars_index if c.get("level") == target_level]
        if not pool:
            pool = chars_index

        random.shuffle(pool)
        for item in pool[:needed]:
            target_chars.append(item["char"])

    return {
        "levelId": level_id,
        "chapter": min((level_id - 1) // 20 + 1, 3),
        "name": f"第 {level_id} 关",
        "targetChars": target_chars,
        "difficulty": {
            "optionCount": option_count,
            "timeLimit": time_limit,
        },
    }