from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func,or_
from pydantic import BaseModel
from typing import List, Optional, Any
import random
import json

from .. import models, schemas, database, auth

router = APIRouter()

# --- Schema ---
class LevelInitRequest(BaseModel):
    level_id: int


def find_composable_words(user_id: int, current_level_chars: List[str], db: Session, limit: int = 2):
    # 1. 获取用户已掌握的所有汉字
    progress = db.query(models.UserProgress).filter(models.UserProgress.user_id == user_id).first()
    mastered = list(progress.mastered_chars.keys()) if progress else []

    # 2. 加上本关的新字 (允许新字组词，难度较高但合理)
    available_chars = set(mastered + current_level_chars)

    if len(available_chars) < 2: return []

    # 3. 查找数据库中所有字都在 available_chars 里的词
    # 这一步如果用 SQL 做完全匹配比较难 (JSON包含查询)，
    # 简单做法：取出所有词，在内存里筛（如果词库不大）。
    # 优化做法：只查包含 current_level_chars 中任意一个字的词

    # 查找包含本关新字的词 (增加相关性)
    candidates = []
    # 这里假设 words 表不大 (几千个)，全查出来也没事。或者用 LIKE 查询
    # 为了演示，我们遍历本关新字，查包含它的词

    for char in current_level_chars:
        # SQL: SELECT * FROM words WHERE chars_json LIKE '%"char"%'
        # SQLite JSON 查询比较弱，可以用字符串匹配兜底
        words = db.query(models.Word).filter(models.Word.text.contains(char)).limit(10).all()
        for w in words:
            # 检查词里的其他字是否已学
            w_chars = list(w.chars_json)
            if all(c in available_chars for c in w_chars):
                candidates.append(w)

    # 去重并随机取
    unique_candidates = list({w.id: w for w in candidates}.values())
    random.shuffle(unique_candidates)

    return unique_candidates[:limit]

# --- Helper: 生成选项 ---
def generate_options(target_char: models.Character, db: Session, count: int = 4):
    # 1. 优先从 confusing_chars (JSON) 中取
    # 注意：sqlite 存的是 list
    confusing = target_char.confusing_chars or []

    options = []
    # 查找混淆字对象
    if confusing:
        options = db.query(models.Character).filter(models.Character.char.in_(confusing)).limit(count-1).all()

    # 2. 如果不够，随机补
    needed = count - 1 - len(options)
    if needed > 0:
        # 排除自己
        random_chars = db.query(models.Character).filter(models.Character.id != target_char.id)\
            .order_by(func.random()).limit(needed).all()
        options.extend(random_chars)

    # 加入正确答案
    options.append(target_char)
    random.shuffle(options)

    return options

# --- API ---
@router.post("/game/init_level")
def init_level(
    req: LevelInitRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    level_id = req.level_id

    # 1. 检查历史记录 (重玩)
    history = db.query(models.LevelHistory).filter(
        models.LevelHistory.user_id == current_user.id,
        models.LevelHistory.level_id == level_id
    ).first()

    if history:
        return json.loads(history.content_json) # 直接返回上次生成的内容

    # 2. 检查家长定制计划
    plan = db.query(models.CustomPlan).filter(
        models.CustomPlan.user_id == current_user.id,
        models.CustomPlan.target_level == level_id,
        models.CustomPlan.is_used == False
    ).first()

    target_chars = []

    if plan:
        # 使用定制汉字
        # plan.chars_json is ["赢", "政"]
        char_list = json.loads(plan.chars_json)
        target_chars = db.query(models.Character).filter(models.Character.char.in_(char_list)).all()
        # 标记为已使用 (或者不标记，允许重玩)
        # plan.is_used = True
        # db.commit()
    else:
        # 3. 自动生成逻辑
        # 难度曲线：每20关升一级
        target_level = min((level_id - 1) // 20 + 1, 5)
        count = 5 if level_id <= 20 else 6

        # 随机抽取
        target_chars = db.query(models.Character).filter(models.Character.level == target_level)\
            .order_by(func.random()).limit(count).all()

        # 兜底：如果不够，从全库取
        if len(target_chars) < count:
            needed = count - len(target_chars)
            more = db.query(models.Character).order_by(func.random()).limit(needed).all()
            target_chars.extend(more)

        # [Day3] 尝试生成词语题
        # 提取本关汉字列表
        current_chars_str = [c.char for c in target_chars]

        word_questions = []
        words = find_composable_words(current_user.id, current_chars_str, db)

        for w in words:
            # 构建词语题结构
            # 需要获取每个字的详情
            w_chars = json.loads(w.chars_json)
            w_char_objs = db.query(models.Character).filter(models.Character.char.in_(w_chars)).all()
            # 按顺序排序
            w_char_objs_sorted = sorted(w_char_objs, key=lambda x: w_chars.index(x.char))

            # 生成干扰项 (从本关字 + 随机字里取)
            # ... generate_word_options ...
            # 简单起见，我们复用 generate_options，只对第一个字生成干扰？
            # 不，词语模式的干扰项应该是：正确字 + 随机字

            # 词语选项生成逻辑
            correct_opts = [{"char": c.char, "state": "normal"} for c in w_char_objs_sorted]

            # 补足到 4-6 个
            needed = 4 - len(correct_opts)
            distractors = []
            if needed > 0:
                random_chars = db.query(models.Character).order_by(func.random()).limit(needed).all()
                distractors = [{"char": c.char, "state": "normal"} for c in random_chars]

            all_options = correct_opts + distractors
            random.shuffle(all_options)

            q = {
                "isWord": True,
                "targetText": w.text,
                "targetChars": [
                    {
                        "char": c.char,
                        "pinyin": c.pinyin,
                        "example": c.example
                    } for c in w_char_objs_sorted
                ],
                "options": all_options
            }
            word_questions.append(q)


    # 4. 构建题目数据
    questions = []
    for char_obj in target_chars:
        # 生成选项
        opts_objs = generate_options(char_obj, db, count=4)

        # 格式化
        q = {
            "isWord": False,
            "targetChar": {
                "id": char_obj.id,
                "char": char_obj.char,
                "pinyin": char_obj.pinyin,
                "example": char_obj.example
            },
            "targetChars": [{ # 兼容词语模式结构
                "char": char_obj.char,
                "pinyin": char_obj.pinyin
            }],
            "options": [
                {
                    "char": o.char,
                    "state": "normal"
                } for o in opts_objs
            ]
        }
        questions.append(q)
    questions.extend(word_questions)
    # 5. 存入历史，以便下次重玩
    result_data = {
        "levelId": level_id,
        "questions": questions,
        "timeLimit": 15 if level_id > 20 else 0
    }

    new_history = models.LevelHistory(
        user_id=current_user.id,
        level_id=level_id,
        content_json=json.dumps(result_data)
    )
    db.add(new_history)
    db.commit()

    return result_data