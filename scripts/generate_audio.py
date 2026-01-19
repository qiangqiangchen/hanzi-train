import asyncio
import os
import json
import edge_tts

# 汉字列表 (这里只列举部分做测试，你可以复制 characters.json 里的字)
CHARS = [
  { "id": "h1", "char": "一", "pinyin": "yī", "tone": 1, "level": 1, "example": "一个", "confusingChars": { "easy": ["二", "三"], "medium": ["十", "七"] } },
  { "id": "h2", "char": "二", "pinyin": "èr", "tone": 4, "level": 1, "example": "二月", "confusingChars": { "easy": ["一", "三"], "medium": ["土", "工"] } },
  { "id": "h3", "char": "三", "pinyin": "sān", "tone": 1, "level": 1, "example": "三天", "confusingChars": { "easy": ["二", "一"], "medium": ["王", "丰"] } },
  { "id": "h4", "char": "四", "pinyin": "sì", "tone": 4, "level": 1, "example": "四季", "confusingChars": { "easy": ["五", "六"], "medium": ["西", "匹"] } },
  { "id": "h5", "char": "五", "pinyin": "wǔ", "tone": 3, "level": 1, "example": "五颜六色", "confusingChars": { "easy": ["四", "六"], "medium": ["王", "丑"] } },
  { "id": "h6", "char": "六", "pinyin": "liù", "tone": 4, "level": 1, "example": "六个", "confusingChars": { "easy": ["七", "八"], "medium": ["文", "兴"] } },
  { "id": "h7", "char": "七", "pinyin": "qī", "tone": 1, "level": 1, "example": "七个", "confusingChars": { "easy": ["九", "十"], "medium": ["匕", "化"] } },
  { "id": "h8", "char": "八", "pinyin": "bā", "tone": 1, "level": 1, "example": "八方", "confusingChars": { "easy": ["六", "人"], "medium": ["入", "儿"] } },
  { "id": "h9", "char": "九", "pinyin": "jiǔ", "tone": 3, "level": 1, "example": "九个", "confusingChars": { "easy": ["七", "十"], "medium": ["几", "丸"] } },
  { "id": "h10", "char": "十", "pinyin": "shí", "tone": 2, "level": 1, "example": "十全十美", "confusingChars": { "easy": ["一", "千"], "medium": ["士", "土"] } },
  
  { "id": "h11", "char": "大", "pinyin": "dà", "tone": 4, "level": 1, "example": "大小", "confusingChars": { "easy": ["小", "人"], "medium": ["太", "天"] } },
  { "id": "h12", "char": "小", "pinyin": "xiǎo", "tone": 3, "level": 1, "example": "小孩", "confusingChars": { "easy": ["大", "少"], "medium": ["少", "水"] } },
  { "id": "h13", "char": "多", "pinyin": "duō", "tone": 1, "level": 1, "example": "多少", "confusingChars": { "easy": ["少", "夕"], "medium": ["夕", "名"] } },
  { "id": "h14", "char": "少", "pinyin": "shǎo", "tone": 3, "level": 1, "example": "多少", "confusingChars": { "easy": ["多", "小"], "medium": ["小", "沙"] } },
  { "id": "h15", "char": "上", "pinyin": "shàng", "tone": 4, "level": 1, "example": "上下", "confusingChars": { "easy": ["下", "土"], "medium": ["止", "卡"] } },
  { "id": "h16", "char": "下", "pinyin": "xià", "tone": 4, "level": 1, "example": "下车", "confusingChars": { "easy": ["上", "卜"], "medium": ["卞", "不"] } },
  { "id": "h17", "char": "左", "pinyin": "zuǒ", "tone": 3, "level": 1, "example": "左右", "confusingChars": { "easy": ["右", "石"], "medium": ["右", "在"] } },
  { "id": "h18", "char": "右", "pinyin": "yòu", "tone": 4, "level": 1, "example": "右手", "confusingChars": { "easy": ["左", "石"], "medium": ["左", "佑"] } },
  
  { "id": "h19", "char": "天", "pinyin": "tiān", "tone": 1, "level": 1, "example": "天空", "confusingChars": { "easy": ["大", "人"], "medium": ["夫", "无"] } },
  { "id": "h20", "char": "地", "pinyin": "dì", "tone": 4, "level": 1, "example": "大地", "confusingChars": { "easy": ["他", "池"], "medium": ["池", "也"] } },
  { "id": "h21", "char": "日", "pinyin": "rì", "tone": 4, "level": 1, "example": "日子", "confusingChars": { "easy": ["目", "月"], "medium": ["曰", "白"] } },
  { "id": "h22", "char": "月", "pinyin": "yuè", "tone": 4, "level": 1, "example": "月亮", "confusingChars": { "easy": ["日", "目"], "medium": ["用", "且"] } },
  { "id": "h23", "char": "水", "pinyin": "shuǐ", "tone": 3, "level": 1, "example": "喝水", "confusingChars": { "easy": ["火", "木"], "medium": ["永", "冰"] } },
  { "id": "h24", "char": "火", "pinyin": "huǒ", "tone": 3, "level": 1, "example": "大火", "confusingChars": { "easy": ["水", "人"], "medium": ["灭", "伙"] } },
  { "id": "h25", "char": "山", "pinyin": "shān", "tone": 1, "level": 1, "example": "大山", "confusingChars": { "easy": ["出", "川"], "medium": ["凶", "仙"] } },
  { "id": "h26", "char": "石", "pinyin": "shí", "tone": 2, "level": 1, "example": "石头", "confusingChars": { "easy": ["右", "古"], "medium": ["右", "后"] } },
  { "id": "h27", "char": "田", "pinyin": "tián", "tone": 2, "level": 1, "example": "水田", "confusingChars": { "easy": ["口", "日"], "medium": ["由", "甲"] } },
  { "id": "h28", "char": "土", "pinyin": "tǔ", "tone": 3, "level": 1, "example": "土地", "confusingChars": { "easy": ["工", "士"], "medium": ["上", "十"] } },

  { "id": "h29", "char": "人", "pinyin": "rén", "tone": 2, "level": 1, "example": "人们", "confusingChars": { "easy": ["大", "入"], "medium": ["入", "八"] } },
  { "id": "h30", "char": "口", "pinyin": "kǒu", "tone": 3, "level": 1, "example": "口水", "confusingChars": { "easy": ["日", "回"], "medium": ["古", "只"] } },
  { "id": "h31", "char": "目", "pinyin": "mù", "tone": 4, "level": 1, "example": "目光", "confusingChars": { "easy": ["日", "自"], "medium": ["且", "月"] } },
  { "id": "h32", "char": "耳", "pinyin": "ěr", "tone": 3, "level": 1, "example": "耳朵", "confusingChars": { "easy": ["目", "且"], "medium": ["儿", "二"] } },
  { "id": "h33", "char": "手", "pinyin": "shǒu", "tone": 3, "level": 1, "example": "双手", "confusingChars": { "easy": ["毛", "丰"], "medium": ["乎", "看"] } },
  { "id": "h34", "char": "足", "pinyin": "zú", "tone": 2, "level": 1, "example": "足球", "confusingChars": { "easy": ["是", "走"], "medium": ["疋", "促"] } },

  { "id": "h35", "char": "爸", "pinyin": "bà", "tone": 4, "level": 2, "example": "爸爸", "confusingChars": { "easy": ["爷", "巴"], "medium": ["把", "色"] } },
  { "id": "h36", "char": "妈", "pinyin": "mā", "tone": 1, "level": 2, "example": "妈妈", "confusingChars": { "easy": ["姐", "妹"], "medium": ["马", "女"] } },
  { "id": "h37", "char": "爷", "pinyin": "yé", "tone": 2, "level": 2, "example": "爷爷", "confusingChars": { "easy": ["爸", "父"], "medium": ["节", "斧"] } },
  { "id": "h38", "char": "奶", "pinyin": "nǎi", "tone": 3, "level": 2, "example": "奶奶", "confusingChars": { "easy": ["妈", "女"], "medium": ["扔", "及"] } },
  { "id": "h39", "char": "哥", "pinyin": "gē", "tone": 1, "level": 2, "example": "哥哥", "confusingChars": { "easy": ["弟", "可"], "medium": ["歌", "奇"] } },
  { "id": "h40", "char": "弟", "pinyin": "dì", "tone": 4, "level": 2, "example": "弟弟", "confusingChars": { "easy": ["哥", "第"], "medium": ["第", "梯"] } },
  { "id": "h41", "char": "姐", "pinyin": "jiě", "tone": 3, "level": 2, "example": "姐姐", "confusingChars": { "easy": ["妹", "且"], "medium": ["祖", "租"] } },
  { "id": "h42", "char": "妹", "pinyin": "mèi", "tone": 4, "level": 2, "example": "妹妹", "confusingChars": { "easy": ["姐", "未"], "medium": ["味", "末"] } }
]

# 输出目录
OUTPUT_DIR = "../public/audio/chars"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# 语音角色 (zh-CN-XiaoxiaoNeural 是非常自然的女声)
VOICE = "zh-CN-XiaoxiaoNeural"

async def generate():
    for item in CHARS:
        char = item['char']
        pinyin = item['pinyin']
        example = item['example']
        
        # 1. 生成单字读音: "天"
        file_char = os.path.join(OUTPUT_DIR, f"{char}.mp3")
        if not os.path.exists(file_char):
            print(f"Generating char: {char}")
            communicate = edge_tts.Communicate(char, VOICE)
            await communicate.save(file_char)
            
        # 2. 生成完整题目语音: "请找出 tiān，天空的天"
        # 这种预生成的体验比实时拼接好太多了
        text_question = f"请找出 {pinyin}，{example}的{char}"
        file_question = os.path.join(OUTPUT_DIR, f"{char}_question.mp3")
        if not os.path.exists(file_question):
            print(f"Generating question: {text_question}")
            communicate = edge_tts.Communicate(text_question, VOICE)
            await communicate.save(file_question)

if __name__ == "__main__":
    asyncio.run(generate())