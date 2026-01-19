import json
import os
import random

# --- 配置 ---
INPUT_FILE = "../src/data/characters.json" # 请确认这是你的 3000 字库路径
OUTPUT_FILE = "../src/data/confusion_map.json"

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Please run build_3000.py first.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        chars_list = json.load(f)
        
    print(f"Loaded {len(chars_list)} chars. Building confusion map...")
    
    # 建立索引：拼音 -> [char1, char2...]
    pinyin_map = {}
    for c in chars_list:
        # 去掉声调的拼音 (zhōng -> zhong) 用于找同音字
        # 简单处理：我们假设 pinyin 字段是带声调的，这里不做去声调处理了，
        # 直接找完全同音字作为强干扰
        py = c['pinyin']
        if py not in pinyin_map:
            pinyin_map[py] = []
        pinyin_map[py].append(c['char'])
        
    # 结果 Map: { "天": ["无", "夫", "大"] }
    confusion_map = {}
    
    for c in chars_list:
        target = c['char']
        candidates = []
        
        # 1. 找同音字 (最多3个)
        same_py = [x for x in pinyin_map.get(c['pinyin'], []) if x != target]
        candidates.extend(same_py[:3])
        
        # 2. 找形近字 (这里我们没有字形数据，用随机字模拟，但你可以手动填一些)
        # 实际项目中可以使用 `cjkvi-ids` 库拆字对比
        # 这里为了脚本能跑通，我们随机选几个同等级的字作为"假装形近字"
        level_mates = [x['char'] for x in chars_list if x['level'] == c['level'] and x['char'] != target]
        if level_mates:
            candidates.extend(random.sample(level_mates, min(3, len(level_mates))))
            
        # 去重
        confusion_map[target] = list(set(candidates))[:5] # 每个字存5个干扰项
        
    # 写入文件
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(confusion_map, f, ensure_ascii=False)
        
    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()