import json
import os
import random

INPUT_FILE = "../src/data/characters.json"
OUTPUT_FILE = "../src/data/confusion_map.json"

def main():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        chars_list = json.load(f)
        
    # 1. 预计算拼音索引 (用于自动补充)
    pinyin_map = {}
    for c in chars_list:
        py = c.get('pinyin', '')
        if py not in pinyin_map: pinyin_map[py] = []
        pinyin_map[py].append(c['char'])

    final_map = {}

    for c in chars_list:
        target = c['char']
        candidates = []
        
        # A. 优先使用手动配置 (Hard > Medium > Easy)
        manual = c.get('confusingChars', {})
        if manual:
            candidates.extend(manual.get('hard', []))
            candidates.extend(manual.get('medium', []))
            candidates.extend(manual.get('easy', []))
            
        # B. 自动补充 (如果不够5个)
        if len(candidates) < 5:
            # 找同音字
            py = c.get('pinyin', '')
            same_py = [x for x in pinyin_map.get(py, []) if x != target]
            # 过滤已有的
            same_py = [x for x in same_py if x not in candidates]
            candidates.extend(same_py[:3])
            
        # C. 随机补充同级字
        if len(candidates) < 5:
            level = c.get('level', 1)
            mates = [x['char'] for x in chars_list if x.get('level') == level and x['char'] != target]
            mates = [x for x in mates if x not in candidates]
            if mates:
                candidates.extend(random.sample(mates, min(5-len(candidates), len(mates))))
        
        final_map[target] = candidates[:5] # 截取前5个

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_map, f, ensure_ascii=False)
    print("Confusion map built.")

if __name__ == "__main__":
    main()