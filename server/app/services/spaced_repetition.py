"""间隔重复算法（从前端 user.js 迁移过来）"""
from datetime import datetime


# 间隔倍率表（单位：秒）
INTERVALS = {
    0: 0,           # 新字，立即复习
    1: 60,          # 1分钟
    2: 300,         # 5分钟
    3: 3600,        # 1小时
    4: 86400,       # 1天
    5: 259200,      # 3天
}


def calculate_next_review(level: int, is_correct: bool) -> dict:
    """
    根据答题结果计算新的学习状态
    
    Returns:
        dict: {level, status, next_review_time}
    """
    now = datetime.utcnow().timestamp() * 1000  # 毫秒时间戳（与前端一致）

    if is_correct:
        new_level = min(level + 1, 5)
        interval_ms = INTERVALS.get(new_level, 259200) * 1000
        next_review = now + interval_ms

        if new_level >= 4:
            status = "mastered"
        elif new_level >= 2:
            status = "familiar"
        else:
            status = "learning"
    else:
        new_level = max(0, level - 2)
        next_review = now  # 立即复习
        status = "learning"

    return {
        "level": new_level,
        "status": status,
        "next_review_time": next_review,
    }