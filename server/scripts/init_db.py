import json
import sys
import os

# 把上级目录 (server) 加入 path 以便导入 app 模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import Base, Character, Word


# 重新创建表 (可选，如果你想清空重来，可以取消注释下面这行)
# Base.metadata.drop_all(bind=engine)
# Base.metadata.create_all(bind=engine)

def init_data():
    db = SessionLocal()

    # 1. 导入汉字 (从前端的 characters.json)
    # 注意：这里的路径是相对于脚本运行目录的
    # 假设你在 server 目录下运行 python scripts/init_db.py
    json_path = "../src/data/characters.json"

    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found!")
        return

    print("Importing characters...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 内存去重集合 (防止本次运行中重复插入)
    seen_chars = set()
    seen_words = set()

    # 预加载数据库中已有的数据 (防止多次运行脚本报错)
    for c in db.query(Character.char).all():
        seen_chars.add(c[0])
    for w in db.query(Word.text).all():
        seen_words.add(w[0])

    count_char = 0
    count_word = 0

    for item in data:
        char_text = item['char']

        # 插入汉字
        if char_text not in seen_chars:
            db_char = Character(
                char=char_text,
                pinyin=item.get('pinyin', ''),
                level=item.get('level', 1),
                example=item.get('example', ''),
                # 这里 confusingChars 可能是 dict，需要转一下或者只取 hard
                confusing_chars=item.get('confusingChars', {}).get('hard', [])
            )
            db.add(db_char)
            seen_chars.add(char_text)
            count_char += 1

        # 插入组词 (example)
        example = item.get('example')
        if example and len(example) in [2, 4]:
            if example not in seen_words:
                db.add(Word(
                    text=example,
                    length=len(example),
                    chars_json=list(example)  # ['天', '空']
                ))
                seen_words.add(example)
                count_word += 1

    # 2. 导入成语 (手动补充一些)
    idioms = ["一马当先", "五花八门", "七上八下", "人山人海", "四面八方", "九牛一毛"]
    for idiom in idioms:
        if idiom not in seen_words:
            db.add(Word(text=idiom, length=4, chars_json=list(idiom)))
            seen_words.add(idiom)
            count_word += 1

    try:
        db.commit()
        print(f"Success! Imported {count_char} characters and {count_word} words.")
    except Exception as e:
        print(f"Error during commit: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_data()