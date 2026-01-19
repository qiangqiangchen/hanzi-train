import asyncio
import os
import json
import edge_tts
import time

# --- 配置区 ---
# [关键] 读取你的完整源文件
DATA_FILE = "../src/data/characters.json" 
OUTPUT_DIR_CHARS = "../public/audio/chars"
VOICE = "zh-CN-XiaoxiaoNeural"
CONCURRENCY = 5  # 并发数 (5个线程同时生成)

# 确保输出目录存在
if not os.path.exists(OUTPUT_DIR_CHARS):
    os.makedirs(OUTPUT_DIR_CHARS)

async def generate_one(char_data, sem, index):
    async with sem: # 控制并发
        char = char_data['char']
        pinyin = char_data.get('pinyin', '') # 如果没有拼音，脚本不会挂
        # [优化] 优先使用 example (组词)，如果没有则回退到 "X字"
        example = char_data.get('example')
        if not example:
            example = f"{char}字"
            
        # 文件名: 天.mp3 / 天_question.mp3
        file_char = os.path.join(OUTPUT_DIR_CHARS, f"{char}.mp3")
        file_question = os.path.join(OUTPUT_DIR_CHARS, f"{char}_question.mp3")
        
        generated = False
        
        # 1. 生成单字读音
        if not os.path.exists(file_char):
            try:
                # 语速稍慢 (-10%)
                communicate = edge_tts.Communicate(char, VOICE, rate="-10%")
                await communicate.save(file_char)
                generated = True
            except Exception as e:
                print(f"[{index}] Error generating char {char}: {e}")

        # 2. 生成题目语音
        if not os.path.exists(file_question):
            try:
                # 话术: "请找出 [pinyin]，[example] 的 [char]"
                # 示例: "请找出 tiān，天空 的 天"
                # 注意：如果 pinyin 为空，TTS 会读汉字，可能不太自然，但能用
                text_parts = ["请找出"]
                if pinyin:
                    text_parts.append(pinyin)
                
                # 稍微加个停顿符号
                text_parts.append("，") 
                text_parts.append(example)
                text_parts.append("的")
                text_parts.append(char)
                
                text = "".join(text_parts)
                
                communicate = edge_tts.Communicate(text, VOICE)
                await communicate.save(file_question)
                generated = True
            except Exception as e:
                print(f"[{index}] Error generating question {char}: {e}")
                
        if generated:
            print(f"[{index}] Generated: {char} ({example})")
            # 极短延时，防止请求过于密集
            await asyncio.sleep(0.1)

async def worker(queue):
    while True:
        # 获取任务
        item = await queue.get()
        await generate_one(item['data'], item['sem'], item['i'])
        queue.task_done()

async def main():
    # 1. 读取完整数据
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found!")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        chars_list = json.load(f)[:100]
    
    print(f"Total characters to process: {len(chars_list)}")
    
    # 2. 创建队列
    queue = asyncio.Queue()
    semaphore = asyncio.Semaphore(1) # 限制每个worker内部的并发（其实由worker数量控制更准）
    
    # 3. 填充队列
    for i, char_data in enumerate(chars_list):
        queue.put_nowait({
            'data': char_data,
            'sem': semaphore,
            'i': i + 1
        })
        
    # 4. 创建 Workers
    tasks = []
    for _ in range(CONCURRENCY):
        task = asyncio.create_task(worker(queue))
        tasks.append(task)
        
    # 5. 等待完成
    await queue.join()
    
    # 取消 workers
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    
    print("All audio generation complete!")

if __name__ == "__main__":
    asyncio.run(main())