import json
import os
import math

# --- 配置 ---
INPUT_FILE = "../src/data/characters.json"  # 你的源文件
OUTPUT_INDEX = "../src/data/chars_index.json"
OUTPUT_DETAIL_DIR = "../public/data"

def main():
    if not os.path.exists(OUTPUT_DETAIL_DIR):
        os.makedirs(OUTPUT_DETAIL_DIR)

    # 1. 读取你的源文件
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        full_data = json.load(f)
    
    print(f"Loaded {len(full_data)} chars.")

    # 2. 生成索引 (只包含 id, char, level)
    # 前端 List 页面和关卡生成器只需要这些
    index_data = []
    for c in full_data:
        index_data.append({
            "id": c["id"],
            "char": c["char"],
            "level": c.get("level", 1) # 默认 Lv1
        })
    
    with open(OUTPUT_INDEX, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False)
    print(f"Generated Index -> {OUTPUT_INDEX}")

    # 3. 生成详情分片 (包含 pinyin, example, confusingChars)
    # 前端详情页、题目语音生成需要这些
    CHUNK_SIZE = 200
    total_chunks = math.ceil(len(full_data) / CHUNK_SIZE)
    
    for i in range(total_chunks):
        chunk = full_data[i*CHUNK_SIZE : (i+1)*CHUNK_SIZE]
        chunk_map = {c["id"]: c for c in chunk}
        
        outfile = os.path.join(OUTPUT_DETAIL_DIR, f"chars_detail_{i}.json")
        with open(outfile, 'w', encoding='utf-8') as f:
            json.dump(chunk_map, f, ensure_ascii=False)
            
    print(f"Generated {total_chunks} detail chunks -> {OUTPUT_DETAIL_DIR}")

if __name__ == "__main__":
    main()