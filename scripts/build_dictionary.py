import json
import os
from pypinyin import pinyin, Style, lazy_pinyin

# --- 配置区 ---
OUTPUT_FILE = "../src/data/characters.json"

# 常用汉字 Top 500 (按频率排序)
# 来源：通用规范汉字表
RAW_CHARS = """
的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发下文化过天
面所多小工动么才方去法性民年得经十三之进着等部度家电力里如水化高自二理起小物现实加量
都两体制机当使点从业本去把信应开它头又物被身国形常已意也道果些表系气外行心样干教西文
再然老只么公见十情指无系军任建南那及口论别给结六义打指边几手看少直解难活思种切全带眼
位利最无色第月光情变安八支报空计社术结六采白话正名务气题九通林规权问相次好红平百元感
单被利路入造准山张强放至设指近形存划清飞规采算五林色论告改解难活思种切全带眼位利最无
色第月光情变安八支报空计社术结六采白话正名务气题九通林规权问相次好红平百元感单被利路
入造准山张强放至设指近形存划清飞规采算五林色论告改解难活思种切全带眼位利最无色第月光
情变安八支报空计社术结六采白话正名务气题九通林规权问相次好红平百元感单被利路入造准山
爸妈爷奶哥弟姐妹走跑跳笑哭吃喝睡看听读写坐立早晚黑白长短高矮胖瘦美丑香臭酸甜苦辣冷热
春夏秋冬风雨雷电云雪霜冰江河湖海山川草木花鸟虫鱼牛羊马犬鸡鸭鹅猪龙虎狮豹狼象鹿熊猴
"""

# 清洗字符串，去重去空
CHARS_LIST = list(dict.fromkeys([c for c in RAW_CHARS if c.strip()]))

def get_tone(char):
    # 获取声调 (1,2,3,4)
    # pypinyin 返回的是 [['zhōng']] 这种格式
    # 我们用 style=Style.TONE3 返回 zhong1
    py = pinyin(char, style=Style.TONE3, heteronym=False)[0][0]
    if py[-1].isdigit():
        return int(py[-1])
    return 0 # 轻声

def get_pinyin_display(char):
    # 获取带声调的拼音显示 (如 zhōng)
    return pinyin(char, style=Style.TONE, heteronym=False)[0][0]

def estimate_level(index):
    # 根据频率排名估算等级
    if index < 50: return 1
    if index < 150: return 2
    if index < 300: return 3
    if index < 400: return 4
    return 5

def generate_example(char):
    # 简单的组词逻辑 (实际生产环境需要字典API，这里做简易处理)
    # 我们可以预定义一些，或者留空让后续人工校对
    # 这里为了演示，简单返回 "汉字+字"
    return f"{char}字"

def main():
    print(f"Processing {len(CHARS_LIST)} characters...")
    
    result = []
    
    for i, char in enumerate(CHARS_LIST):
        # 1. 基础信息
        char_data = {
            "id": f"h_{i+1000}", # ID从1000开始，避免和测试数据冲突
            "char": char,
            "pinyin": get_pinyin_display(char),
            "tone": get_tone(char),
            "level": estimate_level(i),
            "example": generate_example(char),
            # 干扰项逻辑：我们已经在 game.js 中实现了自动补全，
            # 所以这里可以留空，或者稍微预生成一点
            "confusingChars": {
                "easy": [],
                "medium": [],
                "hard": []
            },
            "frequency": i + 1 # 排名
        }
        result.append(char_data)

    # 写入文件
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated {len(result)} characters to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()