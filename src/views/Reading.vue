<template>
  <div class="min-h-screen bg-amber-50 p-6 font-kaiti flex flex-col items-center">
    <div class="w-full max-w-2xl flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-amber-800">📖 小小阅读室</h1>
      <button @click="$router.push('/')" class="bg-white/80 px-4 py-2 rounded-full font-bold shadow hover:bg-white text-amber-700">
        返回首页
      </button>
    </div>

    <div class="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-xl border-4 border-amber-200 relative overflow-hidden">
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-amber-100 rounded-full opacity-50"></div>

      <!-- 生成前 -->
      <div v-if="!story" class="flex flex-col items-center justify-center py-10">
        <div class="text-6xl mb-6 animate-bounce">📚</div>
        <p class="text-gray-500 mb-8 text-center px-8">
          你已经认识了 <span class="text-green-600 font-bold text-xl">{{ userStore.statsCount.master }}</span> 个汉字。<br>
          我们要用这些字为你写一个独一无二的故事！
        </p>

        <!-- 未登录提示 -->
        <div v-if="!userStore.isOnline" class="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-sm text-yellow-700">
          ⚠️ AI 故事需要登录后才能使用。
          <button @click="openLogin" class="text-blue-500 underline ml-1">去登录</button>
        </div>

        <button
          @click="createStory"
          class="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xl px-10 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition active:scale-95 flex items-center gap-2"
          :disabled="loading || !userStore.isOnline"
          :class="!userStore.isOnline ? 'opacity-50 cursor-not-allowed' : ''"
        >
          <span v-if="loading" class="animate-spin">🔄</span>
          <span>{{ loading ? '正在创作...' : '开始生成故事' }}</span>
        </button>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="mt-4 text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
          {{ errorMsg }}
        </div>
      </div>

      <!-- 故事展示 -->
      <div v-else class="animate-fade-in">
        <h2 class="text-3xl font-bold text-center mb-6 text-gray-800 border-b-2 border-amber-100 pb-4">
          {{ story.title }}
        </h2>

        <div class="text-2xl leading-loose text-gray-700 text-justify">
          <span
            v-for="(char, index) in storyChars"
            :key="index"
            class="inline-block cursor-pointer hover:scale-110 transition p-0.5 rounded relative group"
            :class="isKnown(char) ? 'text-gray-700' : 'text-red-500 font-bold'"
            @click="readChar(char)"
          >
            {{ char }}
            <span v-if="!isKnown(char) && !isPunctuation(char)" class="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[8px] bg-red-100 text-red-500 px-1 rounded opacity-0 group-hover:opacity-100">生字</span>
          </span>
        </div>

        <!-- 统计 -->
        <div class="mt-6 flex justify-center gap-4 text-sm">
          <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full">
            已认识: {{ knownCount }} 字
          </span>
          <span class="bg-red-100 text-red-600 px-3 py-1 rounded-full">
            生字: {{ unknownCount }} 字
          </span>
        </div>

        <div class="mt-8 flex justify-center gap-4">
          <button @click="readWholeStory" class="bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-bold hover:bg-blue-200 flex items-center gap-1" :disabled="isReading">
            <span>{{ isReading ? '🔊 朗读中...' : '🔊 朗读全文' }}</span>
          </button>
          <button @click="story = null; errorMsg = ''" class="bg-gray-100 text-gray-600 px-6 py-2 rounded-full font-bold hover:bg-gray-200">
            再写一个
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { useUserStore } from '../stores/user';
import { storyApi } from '../utils/api';
import { audio } from '../utils/audio';
import { Howl } from 'howler';

const userStore = useUserStore();
const loginModal = inject('loginModal');
const story = ref(null);
const loading = ref(false);
const errorMsg = ref('');
const isReading = ref(false);

const storyChars = computed(() => {
  if (!story.value?.content) return [];
  return story.value.content.split('');
});

const isPunctuation = (char) => /[，。！？""''、；：（）【】《》\s\n\r\d]/.test(char);

const isKnown = (char) => {
  if (isPunctuation(char)) return true;
  const record = userStore.characters[char];
  return record && record.level >= 2;
};

const knownCount = computed(() => {
  return storyChars.value.filter(c => !isPunctuation(c) && isKnown(c)).length;
});

const unknownCount = computed(() => {
  return storyChars.value.filter(c => !isPunctuation(c) && !isKnown(c)).length;
});

const openLogin = () => {
  loginModal.open('login');
};

const createStory = async () => {
  loading.value = true;
  errorMsg.value = '';

  const knownChars = Object.keys(userStore.characters).filter(
    c => userStore.characters[c].level >= 2
  );

  try {
    const res = await storyApi.generateStory(knownChars);
    story.value = res;
  } catch (e) {
    const detail = e.response?.data?.detail;
    errorMsg.value = detail || '生成失败，请检查网络或稍后重试';
  } finally {
    loading.value = false;
  }
};

const readChar = (char) => {
  if (isPunctuation(char)) return;
  audio.playChar(char);
};

let currentStoryAudio = null;

const readWholeStory = () => {
  if (isReading.value) {
    // 点击停止
    if (currentStoryAudio) currentStoryAudio.stop();
    window.speechSynthesis.cancel();
    isReading.value = false;
    return;
  }

  isReading.value = true;

  if (story.value.audio_url) {
    if (currentStoryAudio) currentStoryAudio.stop();

    const sound = new Howl({
      src: [story.value.audio_url],
      html5: true,
      onend: () => { isReading.value = false; },
      onloaderror: () => {
        audio.speakTTS(story.value.content);
        isReading.value = false;
      },
    });
    sound.play();
    currentStoryAudio = sound;
  } else {
    audio.speakTTS(story.value.content);
    // TTS 没有精确的 onend，用估算时间
    setTimeout(() => { isReading.value = false; }, story.value.content.length * 300);
  }
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
</style>