<template>
  <div class="min-h-screen bg-amber-50 p-6 font-kaiti flex flex-col items-center">
    
    <!-- 顶部导航 -->
    <div class="w-full max-w-2xl flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-amber-800">📖 小小阅读室</h1>
      <button @click="$router.push('/')" class="bg-white/80 px-4 py-2 rounded-full font-bold shadow hover:bg-white text-amber-700">
        返回首页
      </button>
    </div>

    <!-- 生成器 -->
    <div class="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-xl border-4 border-amber-200 relative overflow-hidden">
      
      <!-- 装饰 -->
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-amber-100 rounded-full opacity-50"></div>
      
      <div v-if="!story" class="flex flex-col items-center justify-center py-10">
        <div class="text-6xl mb-6 animate-bounce">📚</div>
        <p class="text-gray-500 mb-8 text-center px-8">
          你已经认识了 <span class="text-green-600 font-bold text-xl">{{ userStore.statsCount.master }}</span> 个汉字。<br>
          我们要用这些字为你写一个独一无二的故事！
        </p>
        <button 
          @click="createStory" 
          class="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xl px-10 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition active:scale-95 flex items-center gap-2"
          :disabled="loading"
        >
          <span v-if="loading" class="animate-spin">🔄</span>
          <span>{{ loading ? '正在创作...' : '开始生成故事' }}</span>
        </button>
      </div>

      <!-- 故事展示区 -->
      <div v-else class="animate-fade-in">
        <h2 class="text-3xl font-bold text-center mb-6 text-gray-800 border-b-2 border-amber-100 pb-4">
          {{ story.title }}
        </h2>
        
        <div class="text-2xl leading-loose text-gray-700 text-justify">
          <!-- 将文章拆解为单字，点击可发音 -->
          <span 
            v-for="(char, index) in story.content" 
            :key="index"
            class="inline-block cursor-pointer hover:scale-110 transition p-0.5 rounded relative group"
            :class="isKnown(char) ? 'text-gray-700' : 'text-red-500 font-bold'"
            @click="readChar(char)"
          >
            {{ char }}
            <!-- 生字标记 -->
            <span v-if="!isKnown(char)" class="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[8px] bg-red-100 text-red-500 px-1 rounded opacity-0 group-hover:opacity-100">生字</span>
          </span>
        </div>

        <div class="mt-10 flex justify-center gap-4">
          <button @click="readWholeStory" class="bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-bold hover:bg-blue-200">
            🔊 朗读全文
          </button>
          <button @click="story = null" class="bg-gray-100 text-gray-600 px-6 py-2 rounded-full font-bold hover:bg-gray-200">
            再写一个
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { auth } from '../utils/api';
import { audio } from '../utils/audio';
import { Howl } from 'howler';

const userStore = useUserStore();
const story = ref(null);
const loading = ref(false);

const isKnown = (char) => {
  // 简单判断：是否在 charsIndex 里 (或者是标点符号)
  // 如果是标点，直接返回 true
  if (/[，。！？“”]/.test(char)) return true;
  // 检查是否掌握 (level >= 4)
  const record = userStore.characters[char];
  return record && record.level >= 2; // 放宽一点，认识就行
};

const createStory = async () => {
  loading.value = true;
  // 获取已掌握的汉字列表 (level >= 2)
  const knownChars = Object.keys(userStore.characters).filter(c => userStore.characters[c].level >= 2);
  
  try {
    const res = await auth.generateStory(knownChars);
    story.value = res;
  } catch (e) {
    alert('生成失败，请检查网络');
  } finally {
    loading.value = false;
  }
};

const readChar = (char) => {
  if (/[，。！？“”]/.test(char)) return;
  audio.playChar(char);
};

const readWholeStory = () => {
  // [Day10 优化] 优先播放高质量 MP3
  if (story.value.audio_url) {
      // 停止之前的
      if (window.currentStoryAudio) window.currentStoryAudio.stop();
      
      const sound = new Howl({
          src: [story.value.audio_url],
          html5: true,
          onend: () => { console.log('Story finished'); }
      });
      sound.play();
      window.currentStoryAudio = sound; // 存到全局以便打断
  } else {
      // 降级 TTS
      audio.speakTTS(story.value.content);
  }
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
</style>