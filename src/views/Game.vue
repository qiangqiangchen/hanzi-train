<template>
  <div 
    class="h-screen w-full flex flex-col relative overflow-hidden bg-cover bg-center transition-all duration-1000 font-kaiti"
    :class="gameStore.currentChapter?.bgColor || 'bg-blue-50'"
    :style="gameStore.currentChapter?.bgImage ? { backgroundImage: `url(${gameStore.currentChapter.bgImage})` } : {}"
  >
    <!-- Loading -->
    <div v-if="isLoading" class="absolute inset-0 z-50 bg-blue-50 flex flex-col items-center justify-center">
      <div class="text-6xl animate-bounce mb-4">🚂</div>
      <div class="text-gray-500 font-bold">资源加载中...</div>
    </div>

    <div v-show="!isLoading" class="contents">
      <div class="absolute inset-0 bg-white/60 pointer-events-none"></div>

      <!-- 1. 顶部栏 -->
      <div class="relative z-10 px-3 py-2 flex justify-between items-center bg-white/90 backdrop-blur-sm shadow-sm flex-shrink-0 h-10 md:h-16">
        <div class="flex items-center gap-2">
          <button @click="$router.push('/')" class="text-gray-600 font-bold text-xs bg-gray-100 px-2 py-1 rounded active:scale-95">退出</button>
          <span class="text-gray-800 font-bold text-xs md:text-xl leading-none">
            {{ levelId === 'review' ? '复习' : '第' + levelId + '关' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
           <span class="text-xs text-orange-500 font-bold">🔥{{ gameStore.streak }}</span>
           <span class="text-xs text-yellow-600 font-bold">⭐{{ gameStore.score }}</span>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="relative z-10 w-full flex-shrink-0">
        <div v-if="gameStore.timeLimit > 0" class="h-1 bg-gray-100 w-full">
           <div class="h-full transition-all duration-1000 ease-linear" :class="getTimeBarColor" :style="{ width: (gameStore.timeRemaining / gameStore.timeLimit * 100) + '%' }"></div>
        </div>
        <div class="h-1 bg-gray-200 w-full">
           <div class="h-full bg-green-500 transition-all duration-500 ease-out" :style="{ width: gameStore.progressPercent + '%' }"></div>
        </div>
      </div>

      <!-- 2. 中间主区域 -->
      <div v-if="gameStore.currentQuestion" class="relative z-10 flex-1 w-full p-2 flex flex-col justify-center items-center overflow-hidden min-h-0">
        
        <!-- 操作区 -->
        <div class="flex-shrink-0 mb-2 md:mb-6">
          <button @click="playAudio" class="w-16 h-16 md:w-24 md:h-24 bg-white/90 rounded-full shadow-lg active:scale-95 flex items-center justify-center animate-float group transition border-4 border-white/50">
            <span class="text-4xl md:text-6xl group-hover:scale-110 transition">🔊</span>
          </button>
        </div>

        <div v-if="gameStore.currentQuestion.isWord" class="w-full flex justify-center gap-2 mb-6">
          <div v-for="(charObj, idx) in gameStore.currentQuestion.targetChars" 
              :key="idx"
              class="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-4xl font-bold transition-all"
              :class="[idx < gameStore.currentFillIndex ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-300' ]"
          >
              <!-- 显示已填入的字，或者空 -->
              {{ idx < gameStore.currentFillIndex ? charObj.char : '?' }}
          </div>
        </div>

        <!-- 选项区 -->
        <div class="w-full max-w-5xl flex flex-wrap justify-center items-center content-center gap-2 md:gap-6 px-1 py-10">
          <button
            v-for="(opt, index) in gameStore.currentQuestion.options"
            :key="index + '-' + gameStore.currentIndex" 
            @click="handleSelect(opt)"
            :disabled="opt.state !== 'normal'"
            :class="[
              'aspect-square rounded-xl md:rounded-3xl border-b-4 md:border-b-8 flex items-center justify-center font-kaiti transition-all duration-200 shadow-sm relative shrink-0',
              'w-20 h-20 text-4xl',           
              'sm:w-24 sm:h-24 sm:text-5xl',  
              'md:w-32 md:h-32 md:text-7xl', 
              
              opt.state === 'normal' ? 'bg-white border-gray-200 active:border-b-0 active:translate-y-1' : '',
              opt.state === 'wrong' ? 'bg-gray-100 border-gray-200 text-gray-300' : '',
              opt.state === 'correct' ? 'bg-yellow-100 border-green-500 text-green-600 z-20 shadow-xl scale-110' : ''
            ]"
          >
            {{ opt.char }}
          </button>
        </div>
      </div>

      <!-- 技能悬浮按钮 -->
      <div v-if="gameStore.currentSkill" class="absolute bottom-20 right-2 md:bottom-40 md:right-10 z-30">
        <button @click="triggerSkill" :disabled="gameStore.skillUsed" 
          class="w-12 h-12 md:w-20 md:h-20 rounded-full shadow-xl active:scale-95 relative overflow-hidden flex items-center justify-center border-2 md:border-4 border-white transition hover:scale-105 bg-white"
          :class="gameStore.skillUsed ? 'grayscale opacity-50' : ''"
        >
          <span class="text-2xl md:text-4xl filter drop-shadow">{{ getSkillIcon(gameStore.currentSkill) }}</span>
          <div v-if="gameStore.shieldActive" class="absolute inset-0 border-4 border-yellow-300 rounded-full animate-ping opacity-75"></div>
        </button>
        <div v-if="!gameStore.skillUsed" class="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-sm border border-white font-bold">1</div>
      </div>

      <!-- 3. 底部火车 -->
      <div class="relative z-20 h-16 md:h-36 bg-gray-100/95 border-t-2 md:border-t-4 border-gray-300 flex-shrink-0 flex items-end pb-1 md:pb-6 overflow-hidden shadow-inner">
        <div class="absolute bottom-1 md:bottom-4 w-full h-1 md:h-3 bg-gray-300 border-t border-b border-gray-400"></div>
        <div class="flex flex-row-reverse items-end px-2 gap-0.5 md:gap-2 transform transition-transform duration-500 min-w-full justify-end"
             :style="{ transform: `translateX(${Math.max(0, (gameStore.collectedCarriages.length + userStore.equippedParts.length) * (windowWidth < 768 ? 42 : 74) - (windowWidth < 768 ? 100 : 300))}px)` }">
          <TrainHead class="z-10 drop-shadow origin-bottom transform scale-[0.55] md:scale-100" />
          
          <TrainPart 
            v-for="pid in userStore.equippedParts" 
            :key="pid" 
            :partId="pid" 
            class="origin-bottom transform scale-[0.55] md:scale-100 drop-shadow-sm" 
          />

          <transition-group name="carriage-slide">
            <Carriage v-for="c in gameStore.collectedCarriages" :key="c.id" :char="c.char" :type="c.type" class="origin-bottom transform scale-[0.55] md:scale-100" />
          </transition-group>
        </div>
      </div>

      <!-- 弹窗 -->
      <div v-if="showSuccessModal" class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
        <div class="bg-white rounded-2xl p-6 md:p-12 text-center border-4 md:border-8 border-yellow-300 min-w-[200px] md:min-w-[360px] animate-pop-in pointer-events-auto shadow-2xl">
          <div class="text-7xl md:text-9xl font-kaiti text-blue-600 mb-2 md:mb-4 drop-shadow-md">{{ successChar.char }}</div>
          <div class="text-2xl md:text-4xl text-gray-600 font-bold mb-2 md:mb-4 font-mono">{{ successChar.pinyin }}</div>
          <div class="text-lg md:text-2xl text-orange-600 bg-orange-100 px-4 md:px-6 py-1 md:py-2 rounded-full inline-block font-bold">{{ successChar.example }}</div>
        </div>
      </div>

    </div>
    <TutorialOverlay />
    <StoryOverlay ref="storyRef" :script="currentStoryScript" @finish="onStoryFinish" />
  </div>
  
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import Carriage from '../components/game/Carriage.vue';
import TrainHead from '../components/game/TrainHead.vue';
import TrainPart from '../components/game/TrainPart.vue';
import { effects } from '../utils/effects';
import { preloadImages } from '../utils/preload';
import { useWindowSize } from '@vueuse/core';
import TutorialOverlay from '../components/common/TutorialOverlay.vue';
import StoryOverlay from '../components/common/StoryOverlay.vue';
import storyData from '../data/story.json';

const props = defineProps(['levelId']);
const gameStore = useGameStore();
const userStore = useUserStore();
const router = useRouter();
const { width: windowWidth } = useWindowSize();

const showSuccessModal = ref(false);
const successChar = ref({});
const isLoading = ref(true);
let audioTimer = null;
const storyRef = ref(null);
const currentStoryScript = ref(null);


onMounted(async () => {
  console.log('[Game.vue] onMounted called');
  // [修复] 检查剧情
  const story = storyData[props.levelId];
  if (story && story.trigger === 'pre') {
      currentStoryScript.value = { ...story, id: props.levelId };
      storyRef.value.start();
      // 等待剧情结束回调 startGameFlow
      return; 
  }
  
  // 如果没剧情，直接开始
  startGameFlow();
});

onUnmounted(() => {
  if (audioTimer) clearTimeout(audioTimer);
  gameStore.exitGame();
});

const startGameFlow = async () => {
  console.log('[Game.vue] startGameFlow called, stack:', new Error().stack);
  const success = await gameStore.initLevel(props.levelId);
  if (!success) { isLoading.value = false; return; }
  if (gameStore.currentChapter?.bgImage) {
    try { await preloadImages([gameStore.currentChapter.bgImage]); } catch(e){}
  }
  isLoading.value = false;
  audioTimer = setTimeout(() => { gameStore.playQuestionAudio(); }, 500);
};


const getTimeBarColor = computed(() => {
  if (gameStore.timeLimit <= 0) return '';
  const ratio = gameStore.timeRemaining / gameStore.timeLimit;
  if (ratio > 0.5) return 'bg-blue-400';
  if (ratio > 0.2) return 'bg-yellow-400';
  return 'bg-red-500';
});

const playAudio = () => gameStore.playQuestionAudio();
const handleSelect = async (option) => {
  const isCorrect = gameStore.submitAnswer(option);
  if (isCorrect) {
    // 复制对象，防止引用污染
    successChar.value = { ...option };
    
    // 2. [修复] 尝试从当前题目获取完整信息 (最快)
    const q = gameStore.currentQuestion; // 因为选对了，currentQuestion 就是这道题
    if (q && q.targetChar) {
        // 合并 targetChar 的信息 (包含 example, pinyin 等)
        Object.assign(successChar.value, q.targetChar);
    }

    if (!successChar.value.example) {
        const detail = await userStore.getCharDetail(option.char);
        if (detail) {
            Object.assign(successChar.value, detail);
        }
    }

    // 如果选项对象里本身没带拼音 (比如是从干扰项生成的)，尝试补全
    if (!successChar.value.pinyin) {
        successChar.value.pinyin = getPinyin(option.char);
    }
    
    showSuccessModal.value = true;
    if (gameStore.streak > 3) effects.playStreak();
    else effects.playSuccess(window.innerWidth/2, window.innerHeight/2);
    setTimeout(() => showSuccessModal.value = false, 1400); 
  }
};
const getSkillIcon = (type) => type === 'hint' ? '💡' : (type === 'shield' ? '🛡️' : '');
const triggerSkill = () => gameStore.useSkill();

// [修复] 优先从当前关卡题目中查找拼音
const getPinyin = (char) => {
  // 1. 优先检查当前题目队列 (最可靠来源)
  // 加上 ?. 防止 questions 为空时报错
  const q = gameStore.questions?.find(q => q.targetChar.char === char);
  if (q && q.targetChar.pinyin) return q.targetChar.pinyin;
  
  // 2. 尝试从 userStore 的详情缓存里找 (Day 1 实现的缓存)
  // 遍历缓存 values (性能稍低但作为兜底)
  const cached = Object.values(userStore.charsDetailCache || {}).find(c => c.char === char);
  if (cached) return cached.pinyin;

  return ''; 
};
const onStoryFinish = () => {
    console.log('[Game.vue] onStoryFinish called');
    // 剧情播完，开始游戏
    startGameFlow();
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes pop-in { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
.animate-pop-in { animation: pop-in 0.3s ease-out forwards; }
.carriage-slide-enter-active { transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.carriage-slide-enter-from { opacity: 0; transform: translateY(-30px) scale(0.5); }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.animate-float { animation: float 3s ease-in-out infinite; }
</style>