import asyncio
import os
import json
import edge_tts

# --- 配置 ---
STORY_FILE = "../src/data/story.json"
OUTPUT_DIR = "../public/audio/story"
VOICE = "zh-CN-YunxiNeural" # 换个男声演列车长

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

async def main():
    with open(STORY_FILE, 'r', encoding='utf-8') as f:
        story_data = json.load(f)
    
    for level_id, script in story_data.items():
        print(f"Processing Level {level_id}...")
        
        for idx, dialog in enumerate(script['dialogs']):
            text = dialog['text']
            filename = f"story_{level_id}_{idx}.mp3"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            if not os.path.exists(filepath):
                print(f"Generating: {text}")
                communicate = edge_tts.Communicate(text, VOICE)
                await communicate.save(filepath)
            
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())