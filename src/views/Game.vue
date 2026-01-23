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

        <!-- [Day4] 填空槽 -->
        <div v-if="gameStore.currentQuestion.isWord" class="w-full flex justify-center gap-2 mb-4 flex-shrink-0">
            <div 
              v-for="(charObj, idx) in gameStore.currentQuestion.targetChars" 
              :key="idx"
              class="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center text-2xl md:text-4xl font-bold transition-all bg-white"
              :class="idx < gameStore.currentFillIndex ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-gray-300'"
            >
              {{ idx < gameStore.currentFillIndex ? charObj.char : '?' }}
            </div>
        </div>

        <!-- 选项区 -->
         <div class="w-full max-w-5xl flex flex-wrap justify-center items-center content-center gap-4 md:gap-8 px-2 overflow-y-auto pb-24">
          <button
            v-for="(opt, index) in gameStore.currentQuestion.options"
            :key="index"
            @click="handleSelect(opt)"
            :disabled="opt.state !== 'normal'"
            :class="[
              'aspect-square flex items-center justify-center font-kaiti transition-all duration-200 shadow-md relative shrink-0',
              'rounded-2xl md:rounded-3xl border-b-[5px] md:border-b-8',
              
              // [Day6] 动态尺寸控制
              // 3个: w-28 (手机一行放不下就换行，或者缩小)
              // 4个: w-24 (手机2x2)
              // 5个: w-20 (手机3+2)
              
              optionsCount <= 4 ? 'w-24 h-24 md:w-40 md:h-40 text-5xl md:text-8xl' : 'w-20 h-20 md:w-32 md:h-32 text-4xl md:text-6xl',
              
              opt.state === 'normal' ? 'bg-white border-gray-200 text-gray-700 active:border-b-0 active:translate-y-1' : '',
              opt.state === 'wrong' ? 'bg-gray-100 border-gray-200 text-gray-300' : '',
              opt.state === 'correct' ? 'bg-yellow-50 border-green-500 text-green-600 z-20 shadow-xl scale-110 ring-4 ring-green-200' : ''
            ]"
          >
            <svg viewBox="0 0 100 100" class="w-full h-full pointer-events-none p-2">
              <text 
                x="50" y="50" 
                font-size="60" 
                text-anchor="middle" 
                dominant-baseline="central" 
                fill="currentColor"
                class="font-kaiti"
              >
                {{ opt.char }}
              </text>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading 占位 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-500">
        <div class="text-4xl">🚂</div>
        <div class="text-sm">准备中...</div>
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
             :style="{ transform: `translateX(${Math.max(0, (gameStore.collectedCarriages.length + (userStore.equippedParts ? userStore.equippedParts.length : 0)) * (windowWidth < 768 ? 42 : 74) - (windowWidth < 768 ? 100 : 300))}px)` }">
          <TrainHead class="z-10 drop-shadow origin-bottom transform scale-[0.55] md:scale-100" />
          
          <TrainPart 
            v-for="pid in (userStore.equippedParts || [])" 
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

    <!-- 剧情遮罩 -->
    <StoryOverlay ref="storyRef" :script="currentStoryScript" @finish="startGameFlow" />
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed, nextTick } from 'vue';
import { useGameStore } from '../stores/game';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import Carriage from '../components/game/Carriage.vue';
import TrainHead from '../components/game/TrainHead.vue';
import TrainPart from '../components/game/TrainPart.vue';
import { effects } from '../utils/effects';
import { preloadImages } from '../utils/preload';
import { useWindowSize } from '@vueuse/core';
import StoryOverlay from '../components/common/StoryOverlay.vue';
import storyDataRaw from '../data/story.json'; // [修复] 重命名避免冲突

// [修复] 确保 storyData 不是 undefined
const storyData = storyDataRaw || {};

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

const optionsCount = computed(() => gameStore.currentQuestion?.options.length || 4);

onMounted(async () => {
  // 1. 本地剧情检查
  // [修复] 增加可选链，防止 storyData[props.levelId] 报错
  const localStory = storyData[props.levelId];
  
  // 2. 初始化关卡
  const success = await gameStore.initLevel(props.levelId);
  if (!success) { 
      isLoading.value = false; 
      // 简单防死锁：如果初始化失败，回首页
      console.error('Init level failed');
      router.replace('/');
      return; 
  }
  
  // 3. AI 剧情优先
  const aiStory = gameStore.currentStoryScript;
  
  // [修复] 健壮的合并逻辑
  const activeStory = aiStory || (localStory && localStory.trigger === 'pre' ? { ...localStory, id: props.levelId } : null);

  if (activeStory) {
      isLoading.value = false; 
      currentStoryScript.value = activeStory;
      await nextTick();
      if (storyRef.value) storyRef.value.start();
      return; 
  }
  
  startGameFlow();
});

const startGameFlow = async () => {
  isLoading.value = false;
  if (gameStore.currentChapter?.bgImage) {
    try { await preloadImages([gameStore.currentChapter.bgImage]); } catch(e){}
  }
  
  if (audioTimer) clearTimeout(audioTimer);
  audioTimer = setTimeout(() => { gameStore.playQuestionAudio(); }, 500);
};

onUnmounted(() => {
  if (audioTimer) clearTimeout(audioTimer);
  gameStore.exitGame();
});

const getTimeBarColor = computed(() => {
  if (gameStore.timeLimit <= 0) return '';
  const ratio = gameStore.timeRemaining / gameStore.timeLimit;
  if (ratio > 0.5) return 'bg-blue-400';
  if (ratio > 0.2) return 'bg-yellow-400';
  return 'bg-red-500';
});

const playAudio = () => gameStore.playQuestionAudio();
const handleSelect = (option) => {
  const isCorrect = gameStore.submitAnswer(option);
  if (isCorrect) {
    // 1. 初始化
    successChar.value = { ...option };

    // 2. [核心修复] 从当前题目获取完整信息 (拼音、组词)
    const currentQ = gameStore.currentQuestion;
    if (currentQ && currentQ.targetChar) {
        // 直接合并后端给的完整数据
        Object.assign(successChar.value, currentQ.targetChar);
    }

    // 3. (可选) 如果还是没有，再尝试 getPinyin 兜底
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

const getPinyin = (char) => {
  // [修复] 增加 ?. 防止 questions 为空
  const q = gameStore.questions?.find(q => q.targetChars.some(c => c.char === char));
  if (q) {
      const charObj = q.targetChars.find(c => c.char === char);
      if (charObj) return charObj.pinyin;
  }
  // [修复] 增加 ?. 防止 cache 为空
  const cached = Object.values(userStore.charsDetailCache || {}).find(c => c.char === char);
  if (cached) return cached.pinyin;
  return ''; 
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