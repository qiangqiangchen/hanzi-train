
【src/views/Home.vue】
```vue
<template>
  <div class="h-screen w-screen overflow-hidden relative bg-gray-100 font-kaiti">
    <div class="absolute top-0 left-0 w-full z-20 p-4 flex justify-between items-start pointer-events-none">
      <div class="bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center gap-3 pointer-events-auto border border-white/50">
        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl shadow-inner">👶</div>
        <div>
          <div class="font-bold text-gray-800">{{ userStore.info.name }}</div>
          <div class="text-sm text-yellow-600 font-bold flex items-center">
            <span class="mr-1">⭐</span>{{ userStore.progress.totalStars }}
          </div>
        </div>
      </div>
      <div class="flex gap-3 pointer-events-auto">
        <button
          v-if="userStore.reviewList.length > 0"
          @click="startReview"
          class="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition flex items-center animate-pulse border-2 border-white"
        >
          <span class="mr-2 text-xl">🧠</span>
          <div class="text-left">
            <div class="text-[10px] opacity-80 font-bold">每日复习</div>
            <div class="font-bold leading-none text-sm">{{ userStore.reviewList.length }} 个字</div>
          </div>
        </button>
        <router-link to="/reading" class="bg-white/90 p-3 rounded-full shadow-lg hover:scale-105 transition border-2 border-white">
          <span class="text-2xl">📖</span>
        </router-link>
        <router-link to="/garage" class="bg-white/90 p-3 rounded-full shadow-lg hover:scale-105 transition border border-white/50">
          <span class="text-2xl">🚂</span>
        </router-link>
        <router-link to="/parent" class="bg-white/90 p-3 rounded-full shadow-lg hover:scale-105 transition border border-white/50">
          <span class="text-2xl">⚙️</span>
        </router-link>
      </div>
    </div>
    <DailyStreak />
    <div
      class="h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
      ref="scrollContainer"
    >
      <div
        v-for="chapter in displayChapters"
        :key="chapter.id"
        class="w-screen h-full flex-shrink-0 snap-center relative flex flex-col items-center justify-center bg-cover bg-center transition-all duration-700"
        :class="chapter.bgColor"
        :style="chapter.bgImage ? { backgroundImage: `url(${chapter.bgImage})` } : {}"
      >
        <div class="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
        <div class="relative z-10 text-center mb-10 transform transition hover:scale-105 duration-300">
          <h2 class="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest">
            {{ chapter.name }}
          </h2>
          <div v-if="isLocked(chapter)" class="mt-4 text-white/90 bg-black/40 px-6 py-2 rounded-full inline-block font-bold backdrop-blur-sm border border-white/20">
            🔒 需要 {{ Math.ceil(chapter.minStars) }} 颗星星
          </div>
        </div>
        <div class="relative z-10 w-full max-w-5xl px-4 md:px-10">
          <div class="flex flex-wrap justify-center gap-4 md:gap-8">
            <button
              v-for="lvlId in chapter.levels"
              :key="lvlId"
              @click="enterLevel(lvlId, chapter)"
              class="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center text-xl md:text-2xl font-bold shadow-xl transition-all transform hover:scale-110 active:scale-95 relative"
              :class="getLevelClass(lvlId, chapter)"
              :disabled="isLevelLocked(lvlId, chapter)"
            >
              <span v-if="!isLevelLocked(lvlId, chapter)" class="drop-shadow-sm">{{ lvlId }}</span>
              <span v-else class="text-xl">🔒</span>
              <div v-if="getLevelStars(lvlId) > 0" class="absolute -top-3 w-full flex justify-center space-x-0.5">
                <span v-for="n in 3" :key="n" class="text-xs md:text-sm" :class="n <= getLevelStars(lvlId) ? 'text-yellow-400 drop-shadow' : 'text-gray-300'">★</span>
              </div>
              <div v-if="lvlId === userStore.progress.maxLevel" class="absolute inset-0 border-4 border-white rounded-full animate-ping opacity-50"></div>
            </button>
          </div>
        </div>
        <div class="absolute bottom-10 animate-bounce text-white/80 text-lg font-bold flex items-center gap-4">
          <span>←</span> 滑动切换章节 <span>→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import chaptersData from '../data/chapters.json';
import DailyStreak from '../components/common/DailyStreak.vue';

const router = useRouter();
const userStore = useUserStore();

const displayChapters = computed(() => {
    const maxLvl = userStore.progress.maxLevel;
    const currentChapIndex = Math.ceil(maxLvl / 20);
    const totalToShow = Math.max(5, currentChapIndex + 1);

    const res = [];
    for (let i = 1; i <= totalToShow; i++) {
        const configIndex = (i - 1) % chaptersData.length;
        const baseConfig = chaptersData[configIndex];

        res.push({
            ...baseConfig,
            id: i,
            name: i > 3 ? `第 ${i} 章` : baseConfig.name,
            levels: Array.from({length: 20}, (_, k) => (i - 1) * 20 + k + 1),
            minStars: (i - 1) * 20 * 3 * 0.6
        });
    }
    return res;
});

const unlockAudio = () => { audio.init(); };
const isLocked = (chapter) => userStore.progress.totalStars < chapter.minStars;
const isLevelLocked = (lvlId, chapter) => isLocked(chapter) || lvlId > userStore.progress.maxLevel;
const getLevelStars = (lvlId) => lvlId < userStore.progress.maxLevel ? 3 : 0;
const getLevelClass = (lvlId, chapter) => {
  if (isLevelLocked(lvlId, chapter)) return 'bg-gray-200/80 border-gray-400 text-gray-400 cursor-not-allowed backdrop-blur-sm';
  if (lvlId === userStore.progress.maxLevel) return 'bg-gradient-to-br from-yellow-400 to-orange-500 border-white text-white ring-4 ring-yellow-200/50 scale-110 shadow-2xl';
  return 'bg-white/90 border-green-500 text-green-700 hover:bg-green-50';
};
const storyRef = ref(null);
const currentStoryScript = ref(null);
const pendingLevelId = ref(null); 
const enterLevel = (lvlId, chapter) => {
  if (isLevelLocked(lvlId, chapter)) return;

  unlockAudio();
  audio.playSFX('correct');
  router.push(`/game/${lvlId}`);
};


const startReview = () => {
  unlockAudio();
  audio.playSFX('correct');
  router.push('/game/review');
};

</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
.scroll-smooth::-webkit-scrollbar { display: none; }
</style>
```

【src/views/Game.vue】
```vue
<template>
  <div 
    class="h-screen w-full flex flex-col relative overflow-hidden bg-cover bg-center transition-all duration-1000 font-kaiti"
    :class="gameStore.currentChapter?.bgColor || 'bg-blue-50'"
    :style="gameStore.currentChapter?.bgImage ? { backgroundImage: `url(${gameStore.currentChapter.bgImage})` } : {}"
  >
    <div v-if="isLoading" class="absolute inset-0 z-50 bg-blue-50 flex flex-col items-center justify-center">
      <div class="text-6xl animate-bounce mb-4">🚂</div>
      <div class="text-gray-500 font-bold">资源加载中...</div>
    </div>

    <div v-show="!isLoading" class="contents">
      <div class="absolute inset-0 bg-white/60 pointer-events-none"></div>
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
      <div class="relative z-10 w-full flex-shrink-0">
        <div v-if="gameStore.timeLimit > 0" class="h-1 bg-gray-100 w-full">
           <div class="h-full transition-all duration-1000 ease-linear" :class="getTimeBarColor" :style="{ width: (gameStore.timeRemaining / gameStore.timeLimit * 100) + '%' }"></div>
        </div>
        <div class="h-1 bg-gray-200 w-full">
           <div class="h-full bg-green-500 transition-all duration-500 ease-out" :style="{ width: gameStore.progressPercent + '%' }"></div>
        </div>
      </div>

      <div v-if="gameStore.currentQuestion" class="relative z-10 flex-1 w-full p-2 flex flex-col justify-center items-center overflow-hidden min-h-0">
        <div class="flex-shrink-0 mb-2 md:mb-6">
          <button @click="playAudio" class="w-16 h-16 md:w-24 md:h-24 bg-white/90 rounded-full shadow-lg active:scale-95 flex items-center justify-center animate-float group transition border-4 border-white/50">
            <span class="text-4xl md:text-6xl group-hover:scale-110 transition">🔊</span>
          </button>
        </div>
        <div v-if="gameStore.currentQuestion.targetChars && gameStore.currentQuestion.targetChars.length > 1" class="w-full flex justify-center gap-2 mb-4 flex-shrink-0">
            <div 
              v-for="(charObj, idx) in gameStore.currentQuestion.targetChars" 
              :key="idx"
              class="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center text-2xl md:text-4xl font-bold transition-all bg-white"
              :class="idx < gameStore.currentFillIndex ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300 text-gray-300'"
            >
              {{ idx < gameStore.currentFillIndex ? charObj.char : '?' }}
            </div>
        </div>

         <div class="w-full max-w-5xl flex flex-wrap justify-center items-center content-center gap-4 md:gap-8 px-2 overflow-y-auto pb-24">
          <button
            v-for="(opt, index) in gameStore.currentQuestion.options"
            :key="index"
            @click="handleSelect(opt)"
            :disabled="opt.state !== 'normal'"
            :class="[
              'aspect-square flex items-center justify-center font-kaiti transition-all duration-200 shadow-md relative shrink-0',
              'rounded-2xl md:rounded-3xl border-b-[5px] md:border-b-8',

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
      <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-500">
        <div class="text-4xl">🚂</div>
        <div class="text-sm">准备中...</div>
      </div>
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

      <div v-if="showSuccessModal" class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
        <div class="bg-white rounded-2xl p-6 md:p-12 text-center border-4 md:border-8 border-yellow-300 min-w-[200px] md:min-w-[360px] animate-pop-in pointer-events-auto shadow-2xl">
          <div class="text-7xl md:text-9xl font-kaiti text-blue-600 mb-2 md:mb-4 drop-shadow-md">{{ successChar.char }}</div>
          <div class="text-2xl md:text-4xl text-gray-600 font-bold mb-2 md:mb-4 font-mono">{{ successChar.pinyin }}</div>
          <div class="text-lg md:text-2xl text-orange-600 bg-orange-100 px-4 md:px-6 py-1 md:py-2 rounded-full inline-block font-bold">{{ successChar.example }}</div>
        </div>
      </div>

    </div>

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
import storyDataRaw from '../data/story.json'; 

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
  const localStory = storyData[props.levelId];
  
  const success = await gameStore.initLevel(props.levelId);
  if (!success) { 
      isLoading.value = false; 
      console.error('Init level failed');
      router.replace('/');
      return; 
  }
  
  const aiStory = gameStore.currentStoryScript;
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
    successChar.value = { ...option };
    if (!successChar.value.pinyin) successChar.value.pinyin = getPinyin(option.char);
    
    showSuccessModal.value = true;
    if (gameStore.streak > 3) effects.playStreak();
    else effects.playSuccess(window.innerWidth/2, window.innerHeight/2);
    setTimeout(() => showSuccessModal.value = false, 1400); 
  }
};
const getSkillIcon = (type) => type === 'hint' ? '💡' : (type === 'shield' ? '🛡️' : '');
const triggerSkill = () => gameStore.useSkill();

const getPinyin = (char) => {
  const q = gameStore.questions?.find(q => q.targetChars.some(c => c.char === char));
  if (q) {
      const charObj = q.targetChars.find(c => c.char === char);
      if (charObj) return charObj.pinyin;
  }
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
```

【src/views/Result.vue】
```vue
<template>
  <div class="h-screen w-full flex flex-col items-center justify-between overflow-hidden relative bg-gradient-to-b from-blue-300 to-blue-100 py-4 font-kaiti">
    
    <!-- 背景装饰 -->
    <div class="absolute bottom-0 w-full h-1/2 bg-green-200 rounded-t-[100%] scale-150 z-0"></div>
    <div class="absolute top-10 left-10 text-white/40 text-6xl animate-pulse">☁️</div>

    <!-- 1. 火车展示 -->
    <div class="absolute top-[10%] w-full h-32 md:h-64 z-10 pointer-events-none overflow-hidden">
      <div class="absolute bottom-2 w-full h-2 md:h-4 bg-gray-400 border-t border-white"></div>
      <div 
        class="absolute bottom-4 flex flex-row-reverse items-end gap-1 md:gap-6"
        :class="{ 'animate-train-pass': startAnimation }"
      >
        <TrainHead class="transform scale-75 md:scale-125 origin-bottom" />
        
        <Carriage v-for="c in carriages" :key="c.id" :char="c.char" :type="c.type" class="transform scale-75 md:scale-125 origin-bottom" />
      </div>
    </div>

    <!-- 2. 内容区 -->
    <div v-if="showScoreBoard" class="relative z-20 h-full flex flex-col items-center justify-end md:justify-center pb-8 px-6 animate-fade-in-up gap-6 w-full max-w-2xl">
      
      <!-- 标题 & 星星 -->
      <div class="text-center w-full flex-shrink-0">
        <h1 class="text-4xl md:text-7xl font-bold text-yellow-500 drop-shadow-md mb-2 md:mb-6 stroke-text tracking-wider pb-2">
          闯关成功
        </h1>
        <div class="flex justify-center space-x-2 md:space-x-6 mt-1">
          <div v-for="i in 3" :key="i" class="text-5xl md:text-8xl transition-all duration-500" :class="i <= stars ? 'text-yellow-400' : 'text-gray-300 opacity-50'">⭐</div>
        </div>
      </div>

      <!-- 分数卡片 -->
      <div class="bg-white/95 backdrop-blur rounded-2xl md:rounded-3xl shadow-xl text-center w-full max-w-[260px] md:max-w-md border-b-4 md:border-b-8 border-blue-200 p-4 md:p-8 flex-shrink-0">
        <div class="text-gray-400 text-sm md:text-xl mb-1">本关得分</div>
        <div class="text-5xl md:text-8xl font-bold text-blue-600 font-mono my-2">{{ score }}</div>
        <div class="inline-block text-xs md:text-lg text-green-600 font-bold bg-green-100 px-3 md:px-6 py-1 md:py-2 rounded-full">
          收集汉字：{{ carriages.length }} 个
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="w-full max-w-sm md:max-w-md flex flex-col gap-3 md:gap-4 mt-4 flex-shrink-0">
        <button 
          @click="nextLevel"
          class="w-full bg-green-500 hover:bg-green-600 text-white py-3 md:py-5 rounded-xl md:rounded-2xl text-xl md:text-3xl font-bold shadow-lg animate-bounce-slow active:scale-95 transition"
        >
          ▶️ 下一关
        </button>

        <div class="flex gap-3 md:gap-4">
            <button @click="replay" class="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-lg md:text-2xl font-bold shadow-md active:scale-95 transition">
              🔄 重玩
            </button>
            <button @click="$router.replace('/')" class="flex-1 bg-white hover:bg-gray-100 text-gray-600 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-lg md:text-2xl font-bold shadow-md active:scale-95 transition">
              🏠 首页
            </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';
import { audio } from '../utils/audio';
import Carriage from '../components/game/Carriage.vue';
import TrainHead from '../components/game/TrainHead.vue';
import { effects } from '../utils/effects';

const router = useRouter();
const gameStore = useGameStore();
const startAnimation = ref(false);
const showScoreBoard = ref(false);
const carriages = ref([]);
const score = ref(0);
const stars = ref(0);
const timers = [];
let hasPlayedWin = false;

onMounted(() => {
  const data = gameStore.resultData;
  if (!data) {
    router.replace('/');
    return;
  }

  carriages.value = data.carriages;
  score.value = data.score;
  stars.value = data.stars;

  timers.push(setTimeout(() => {
    startAnimation.value = true;
    audio.playSFX('whistle'); 
  }, 1000));

  timers.push(setTimeout(() => {
    if (hasPlayedWin) return;
    hasPlayedWin = true;

    showScoreBoard.value = true;
    audio.playVoice('闯关成功！', 'win');
    effects.playWin();
  }, 3500));
});

onUnmounted(() => {
  timers.forEach(id => clearTimeout(id));
});

const replay = () => {
  const lvlId = gameStore.resultData.levelId;
  if (lvlId === 'review') router.replace('/game/review');
  else router.replace(`/game/${lvlId}`);
};

const nextLevel = () => {
  const currentId = gameStore.resultData.levelId;
  
  if (currentId === 'review') {
      router.replace('/');
      return;
  }

  const nextId = currentId + 1;
  const MAX_LEVEL = 500; 
  
  if (nextId <= MAX_LEVEL) {
    router.replace(`/game/${nextId}`);
  } else {
    alert('🎉 恭喜！你已经完成了所有关卡，成为了汉字大师！');
    router.replace('/');
  }
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
.stroke-text { -webkit-text-stroke: 1.0px #fff; }
@keyframes trainPass { 0% { transform: translateX(-100vw); } 100% { transform: translateX(150vw); } }
.animate-train-pass { animation: trainPass 8s linear forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
.animate-bounce-slow { animation: bounce 2s infinite; }
@keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
</style>
```

【src/views/Parent.vue】
```vue
<template>
  <div class="h-screen overflow-y-auto bg-gray-50 flex flex-col items-center p-4 md:p-6 font-kaiti">
    <div v-if="!isUnlocked" class="flex-1 flex flex-col items-center justify-center w-full max-w-md min-h-[500px]">
      <div class="bg-white p-8 rounded-2xl shadow-lg w-full text-center">
        <h2 class="text-2xl font-bold mb-6 text-gray-700">🔒 家长验证</h2>
        <p class="mb-4 text-gray-500">请回答：{{ num1 }} + {{ num2 }} = ?</p>
        <input 
          v-model="inputAnswer" 
          type="number" 
          class="w-full text-center text-3xl border-2 border-blue-200 rounded-lg py-3 mb-6 focus:border-blue-500 outline-none"
          placeholder="输入结果"
          @keyup.enter="checkAnswer"
        >
        <div class="flex space-x-4">
          <button @click="$router.push('/')" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">返回</button>
          <button @click="checkAnswer" class="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold shadow-md">确认</button>
        </div>
      </div>
    </div>
    <div v-else class="w-full max-w-4xl animate-fade-in mb-10">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">👨‍👩‍👧 家长中心</h1>
        <button @click="$router.push('/')" class="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold hover:bg-gray-300 transition">
          退出
        </button>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-blue-500 pl-3">学习概览</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-blue-50 p-4 rounded-xl">
                <div class="text-xs text-blue-400 mb-1">总识字量</div>
                <div class="text-3xl font-bold text-blue-600">{{ userStore.statsCount.total }}</div>
              </div>
              <div class="bg-green-50 p-4 rounded-xl">
                <div class="text-xs text-green-400 mb-1">已掌握</div>
                <div class="text-3xl font-bold text-green-600">{{ userStore.statsCount.master }}</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-xl">
                <div class="text-xs text-yellow-500 mb-1">当前关卡</div>
                <div class="text-3xl font-bold text-yellow-600">{{ userStore.progress.maxLevel }}</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-xl">
                <div class="text-xs text-purple-400 mb-1">获得星星</div>
                <div class="text-3xl font-bold text-purple-600">{{ userStore.progress.totalStars }}</div>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-gray-100">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-gray-700">近7天学习趋势</h4>
              </div>
              <LearningChart :history="userStore.history" />
            </div>
          </div>
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-green-500 pl-3">学习建议</h3>
            <p class="text-gray-600 text-sm leading-relaxed" v-if="userStore.statsCount.total < 10">
              孩子刚刚起步，建议每天坚持玩 10 分钟，多给予口头鼓励。
            </p>
            <p class="text-gray-600 text-sm leading-relaxed" v-else>
              掌握情况非常棒！可以尝试挑战更高难度的关卡。
            </p>
          </div>
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
            <h3 class="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <span>☁️</span> 云端同步
            </h3>
            <div v-if="!userProfile" class="flex flex-col gap-3">
              <input v-model="form.username" type="text" placeholder="用户名" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <input v-model="form.password" type="password" placeholder="密码" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <div class="flex gap-2">
                <button @click="handleLogin" class="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600">登录</button>
                <button @click="handleRegister" class="flex-1 bg-white text-blue-500 border border-blue-500 py-2 rounded-lg font-bold hover:bg-blue-50">注册</button>
              </div>
            </div>
            <div v-else>
              <div class="flex justify-between items-center mb-4">
                <span class="font-bold text-gray-700">👤 {{ userProfile.username }}</span>
                <button @click="handleLogout" class="text-xs text-red-500 underline">退出</button>
              </div>
              <div class="flex gap-2 mb-4">
                <button @click="userStore.syncUpload" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg font-bold hover:bg-blue-200 text-sm flex items-center justify-center gap-1">⬆️ 上传</button>
                <button @click="userStore.syncDownload" class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold hover:bg-green-200 text-sm flex items-center justify-center gap-1">⬇️ 下载</button>
              </div>
              <div class="text-xs text-gray-400 text-center">上次同步: {{ formatTime(userProfile.last_sync) }}</div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-orange-500 pl-3">设置</h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span class="text-gray-700 font-bold">显示拼音</span>
                <button @click="toggle('showPinyin')" class="w-12 h-6 rounded-full relative transition-colors duration-300" :class="userStore.settings.showPinyin ? 'bg-green-500' : 'bg-gray-300'">
                  <div class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm" :class="userStore.settings.showPinyin ? 'left-7' : 'left-1'"></div>
                </button>
              </div>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-700 font-bold">音效音量</span>
                  <span class="text-gray-500 text-sm">{{ Math.round(userStore.settings.sfxVolume * 100) }}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" :value="userStore.settings.sfxVolume" @input="updateVolume('sfx', $event.target.value)" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500">
              </div>
            </div>
          </div>
       

        </div>
        
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100">
            <h3 class="text-lg font-bold text-yellow-600 mb-4 flex items-center gap-2"><span>📅</span> 学习计划干预</h3>
            <ParentSettings />
          </div>

          <div class="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
            <h3 class="text-lg font-bold text-red-500 mb-4">数据管理</h3>
            <router-link to="/print" class="block w-full text-center py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition mb-4">
              🖨️ 生成描红字帖
            </router-link>
            <div class="flex gap-2 mb-4">
              <button @click="exportData" class="flex-1 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50">📤 导出</button>
              <button @click="importData" class="flex-1 py-2 border border-green-200 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50">📥 导入</button>
            </div>
            <button @click="handleReset" class="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition">
              ⚠️ 重置所有进度
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import LearningChart from '../components/parent/LearningChart.vue';
import ParentSettings from './ParentSettings.vue';
import { auth } from '../utils/api';

const userStore = useUserStore();
const isUnlocked = ref(false);
const num1 = Math.floor(Math.random() * 10);
const num2 = Math.floor(Math.random() * 10);
const inputAnswer = ref('');
const userProfile = ref(null);
const form = ref({ username: '', password: '' });

const checkAnswer = () => {
  if (parseInt(inputAnswer.value) === num1 + num2) isUnlocked.value = true;
  else { alert('答案不对哦'); inputAnswer.value = ''; }
};

const handleReset = () => {
  if (confirm('确定要重置吗？')) userStore.resetAllData();
};

const toggle = (key) => userStore.updateSettings({ [key]: !userStore.settings[key] });
const updateVolume = (t, v) => {
    userStore.updateSettings({ sfxVolume: parseFloat(v) });
    audio.playSFX('correct');
};

const exportData = () => {
  const data = userStore.serializeData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup.json`;
  a.click();
};

const importData = () => {
  const str = prompt('粘贴JSON:');
  if (str) userStore.deserializeData(str);
};


onMounted(async () => {
  try { userProfile.value = await auth.getMe(); } catch (e) { auth.logout(); }
});
const handleLogin = async () => {
    try { await auth.login(form.value.username, form.value.password); userProfile.value = await auth.getMe(); } catch(e){ alert('Error'); }
};
const handleRegister = async () => {
    try { await auth.register(form.value.username, form.value.password); userProfile.value = await auth.getMe(); } catch(e){ alert('Error'); }
};
const handleLogout = () => { auth.logout(); userProfile.value = null; };
const formatTime = (t) => t ? new Date(t).toLocaleString() : '无';
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
</style>
```


【src/views/Reading.vue】
```vue
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
```


【src/views/Garage.vue】
```vue
<template>
  <div class="h-screen bg-gray-100 flex flex-col font-kaiti overflow-hidden">
    
    <!-- 顶部导航 -->
    <div class="flex-shrink-0 flex flex-col md:flex-row justify-between items-center p-4 md:p-6 bg-gray-100 z-10 gap-3">
      <div class="flex flex-wrap justify-center gap-2">
        <button 
          v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          class="px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold transition-all text-xs md:text-base whitespace-nowrap"
          :class="activeTab === tab.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-500'"
        >
          {{ tab.name }}
        </button>
      </div>
      <router-link to="/" class="bg-gray-200 text-gray-700 px-6 py-1.5 md:py-2 rounded-full font-bold text-sm md:text-base">
        返回
      </router-link>
    </div>

    <!-- 内容主区域 -->
    <div class="flex-1 w-full max-w-5xl mx-auto overflow-hidden px-4 pb-4 md:px-6">
      
      <!-- Tab 1: 汉字本 (虚拟滚动逻辑) -->
      <div v-if="activeTab === 'chars'" class="h-full flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
         <div class="p-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
           <div class="relative">
             <input v-model="searchQuery" type="text" placeholder="🔍 输入汉字搜索..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-400 outline-none text-base bg-gray-50">
             <div v-if="searchQuery" @click="searchQuery=''" class="absolute right-4 top-3.5 text-gray-400 cursor-pointer">✕</div>
           </div>
         </div>
         <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
             <div v-if="flatChars.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
                <div class="text-6xl mb-4">📭</div>
                <div>{{ searchQuery ? '没有找到这个字' : '还没有收集到汉字' }}</div>
             </div>
             <div v-else class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 pb-20">
                <div 
                  v-for="charData in flatChars" 
                  :key="charData.char"
                  class="aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition active:scale-95 bg-white cursor-pointer shadow-sm hover:shadow-md relative"
                  :class="getStatusColor(charData.status)"
                  @click="openDetail(charData.char)"
                >
                  <span class="text-2xl md:text-4xl font-bold text-gray-800">{{ charData.char }}</span>
                  <div class="w-2/3 h-1.5 bg-gray-100 mt-2 rounded-full overflow-hidden">
                    <div class="h-full bg-current opacity-60" :style="{ width: Math.min(100, (charData.streak / 5) * 100) + '%' }"></div>
                  </div>
                </div>
             </div>
         </div>
      </div>

      <!-- Tab 2: 火车库 & 配件 -->
      <div v-if="activeTab === 'trains'" class="h-full overflow-y-auto animate-fade-in custom-scrollbar">
        <!-- 车头列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
            <div v-for="train in trainsList" :key="train.id" class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border-2 md:border-4" :class="[isUnlocked(train.id) ? 'border-white' : 'border-gray-100 opacity-80', userStore.currentTrainId === train.id ? 'ring-2 md:ring-4 ring-green-400 border-green-100' : '']">
              <div class="flex items-center space-x-4">
                <div class="w-20 h-20 md:w-32 md:h-24 rounded-xl flex items-center justify-center shadow-inner relative flex-shrink-0 bg-gray-100" :class="isUnlocked(train.id) ? train.color : 'bg-gray-300'">
                  <span class="text-3xl md:text-4xl">🚂</span>
                  <div v-if="!isUnlocked(train.id)" class="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl text-xl">🔒</div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-start"><h3 class="text-lg md:text-2xl font-bold text-gray-800 truncate">{{ train.name }}</h3><span v-if="userStore.currentTrainId === train.id" class="bg-green-100 text-green-700 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold">已装备</span></div>
                  <p class="text-gray-500 text-xs mt-1 mb-2 line-clamp-2">{{ train.desc }}</p>
                  <div class="flex justify-between items-center mt-2"><span class="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold">技能: {{ train.skill }}</span><button v-if="userStore.currentTrainId !== train.id && isUnlocked(train.id)" @click="equip(train.id)" class="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">装备</button><span v-else-if="!isUnlocked(train.id)" class="text-orange-500 text-xs font-bold">需{{ train.unlockValue }}星</span></div>
                </div>
              </div>
            </div>
        </div>

        <!-- [修复] 补回组装工厂 -->
        <div class="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-300 mb-20">
          <h3 class="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><span>🔧</span> 组装车厢</h3>
          
          <!-- 预览区 -->
          <div class="flex items-end gap-1 mb-6 p-4 bg-gray-200/50 rounded-xl overflow-x-auto min-h-[80px]">
             <!-- 注意：车头在最左，配件在后，这里不需要 reverse -->
             <TrainHead class="transform scale-75 origin-bottom flex-shrink-0" />
             <TrainPart v-for="pid in userStore.equippedParts" :key="pid" :partId="pid" class="transform scale-75 origin-bottom" />
             <div v-if="userStore.equippedParts.length === 0" class="text-gray-400 text-sm self-center ml-4">点击下方配件挂载</div>
          </div>

          <!-- 配件列表 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              v-for="part in allParts" 
              :key="part.id"
              class="bg-white p-3 md:p-4 rounded-xl border-2 flex flex-col items-center relative cursor-pointer transition hover:shadow-md hover:border-blue-300"
              :class="isPartUnlocked(part.id) ? (isPartEquipped(part.id) ? 'border-green-500 bg-green-50' : 'border-gray-200') : 'opacity-60 border-dashed'"
              @click="togglePart(part.id)"
            >
              <div class="text-3xl md:text-4xl mb-2">{{ part.icon }}</div>
              <div class="font-bold text-gray-800 text-sm">{{ part.name }}</div>
              
              <!-- 状态 -->
              <div v-if="isPartEquipped(part.id)" class="absolute top-2 right-2 text-green-500 text-lg">✔</div>
              <div v-if="!isPartUnlocked(part.id)" class="absolute inset-0 bg-gray-100/80 flex items-center justify-center font-bold text-gray-500 text-xs rounded-xl backdrop-blur-[1px]">
                🔒 需{{ part.unlockValue }}字
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 成就馆 -->
      <div v-if="activeTab === 'achievements'" class="h-full overflow-y-auto animate-fade-in custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 p-4 md:p-6">
          <div v-for="ach in allAchievements" :key="ach.id" class="bg-white rounded-xl p-4 shadow-sm border flex items-center" :class="isAchieved(ach.id) ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 opacity-60 grayscale'">
            <div class="w-12 h-12 mr-3 flex-shrink-0 relative flex items-center justify-center bg-gray-50 rounded-full border overflow-hidden text-2xl">
              <span v-if="!isAchieved(ach.id)">🔒</span>
              <img v-else :src="`/images/achievements/${ach.icon}`" class="w-full h-full object-cover" @error="(e)=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex'}" />
              <span class="absolute inset-0 items-center justify-center bg-yellow-100 hidden">🏆</span>
            </div>
            <div><div class="font-bold text-gray-800 text-sm md:text-base">{{ ach.name }}</div><div class="text-xs text-gray-500">{{ ach.desc }}</div></div>
          </div>
        </div>
      </div>

    </div>

    <!-- 弹窗 -->
    <div v-if="selectedChar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="selectedChar = null">
      <div class="bg-white rounded-3xl p-6 w-full max-w-sm animate-pop-in relative">
        <button @click="selectedChar = null" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        <div class="text-center mb-6">
          <div class="text-4xl font-bold text-gray-800 mb-2">{{ selectedChar }}</div>
          <div v-if="userStore.settings.showPinyin" class="text-xl text-gray-500 font-mono">{{ getPinyin(selectedChar) }}</div>
        </div>
        <div class="flex justify-center">
          <HanziWriter :char="selectedChar" :size="260" />
        </div>
        <div class="mt-6 text-center">
          <div class="text-sm text-gray-400">掌握程度</div>
          <div class="flex justify-center gap-1 mt-2">
            <div v-for="i in 5" :key="i" class="w-8 h-2 rounded-full" :class="i <= getLevel(selectedChar) ? 'bg-green-500' : 'bg-gray-200'"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import trainsData from '../data/trains.json';
import achievementsData from '../data/achievements.json';
import charsData from '../data/characters.json'; 
import trainPartsData from '../data/train_parts.json'; // 引入配件数据
import HanziWriter from '../components/common/HanziWriter.vue';
import TrainHead from '../components/game/TrainHead.vue';
import TrainPart from '../components/game/TrainPart.vue'; // 引入配件组件

const userStore = useUserStore();
const activeTab = ref('chars'); 
const trainsList = ref(trainsData);
const allAchievements = ref(achievementsData);
const allParts = ref(trainPartsData);
const searchQuery = ref('');
const selectedChar = ref(null);

const tabs = [
    { id: 'chars', name: '📖 汉字本' },
    { id: 'trains', name: '🚂 火车库' },
    { id: 'achievements', name: '🏆 成就馆' }
];

const flatChars = computed(() => {
  const all = userStore.characters;
  const query = searchQuery.value.trim();
  const arr = [];
  Object.keys(all).forEach(key => {
    if (!query || key.includes(query)) {
      arr.push({ ...all[key], char: key });
    }
  });
  return arr;
});

onMounted(() => {
  const newUnlockId = userStore.checkUnlockTrains();
  if (newUnlockId) audio.playSFX('correct'); 
  userStore.checkAchievements();
  userStore.checkUnlockParts();
});

const isUnlocked = (id) => userStore.trains.includes(id);
const isAchieved = (id) => userStore.achievements.includes(id);
const equip = (id) => { userStore.equipTrain(id); audio.playSFX('correct'); };

// 配件逻辑
const isPartUnlocked = (id) => userStore.unlockedParts.includes(id);
const isPartEquipped = (id) => userStore.equippedParts.includes(id);

const togglePart = (id) => {
  if (!isPartUnlocked(id)) return;
  const current = [...userStore.equippedParts];
  const index = current.indexOf(id);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    if (current.length >= 3) {
      alert('车厢太重啦，最多挂 3 个配件！'); 
      return;
    }
    current.push(id);
  }
  userStore.equipParts(current);
  audio.playSFX('attach'); 
};

const openDetail = (char) => {
  audio.playChar(char);
  selectedChar.value = char;
};

const getPinyin = (char) => {
  const charObj = charsData.find(c => c.char === char);
  return charObj ? charObj.pinyin : ''; 
};

const getLevel = (char) => userStore.characters[char]?.level || 0;

const getStatusColor = (status) => {
  if (status === 'mastered') return 'border-green-200 text-green-700 bg-green-50';
  if (status === 'familiar') return 'border-blue-200 text-blue-700 bg-blue-50';
  return 'border-orange-200 text-orange-700 bg-orange-50';
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes pop-in { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
.animate-pop-in { animation: pop-in 0.3s ease-out forwards; }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 3px; }
</style>
```


【src/utils/audio.js】
```js
import { Howl, Howler } from 'howler';

const soundCache = {};
const playHistory = {};

const VOLUMES = {
  bgm: 0.3,
  sfx: 1.0,
  voice: 1.0
};

export const audio = {
  currentBGM: null,

  init() {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  },

  setVolume(bgmVol, sfxVol) {
    VOLUMES.bgm = bgmVol;
    VOLUMES.sfx = sfxVol;
    if (this.currentBGM) {
      this.currentBGM.volume(bgmVol);
    }
  },

  // [修复] 增加 stopAll 方法
  stopAll() {
    // 停止所有正在播放的声音 (除了 BGM)
    // Howler.stop() 会停止所有。如果我们想保留 BGM，比较麻烦。
    // 但 finishGame 切到 Result 页，通常希望安静一点，或者 Result 页自己播 BGM。
    // 所以这里直接 Howler.stop() 是安全的，Result 页会自己处理。
    Howler.stop(); 
  },

  playBGM(url) {
    if (this.currentBGM && this.currentBGM._src.includes(url)) return;
    if (this.currentBGM) {
      this.currentBGM.fade(VOLUMES.bgm, 0, 1000);
      setTimeout(() => { if (this.currentBGM) this.currentBGM.stop(); }, 1000);
    }
    const sound = new Howl({ src: [url], loop: true, volume: 0, html5: true });
    sound.play();
    sound.fade(0, VOLUMES.bgm, 1000);
    this.currentBGM = sound;
  },

  checkDebounce(key, duration = 300) {
    const now = Date.now();
    if (playHistory[key] && now - playHistory[key] < duration) {
      return false; 
    }
    playHistory[key] = now;
    return true;
  },

  playSFX(name) {
    let url = `/audio/sfx/${name}.mp3`;
    if (name === 'attach') url = 'https://actions.google.com/sounds/v1/cartoon/clank_car_crash.ogg';
    else if (name === 'wrong') url = 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg';
    else if (name === 'correct') url = 'https://actions.google.com/sounds/v1/cartoon/pop.ogg';

    const debounceTime = name === 'whistle' ? 2000 : 150;
    if (!this.checkDebounce(url, debounceTime)) return;

    if (!soundCache[url]) {
      soundCache[url] = new Howl({
        src: [url],
        volume: VOLUMES.sfx,
        onloaderror: (id, err) => console.warn(`Audio Missing: ${url}`)
      });
    } else {
      soundCache[url].volume(VOLUMES.sfx);
    }
    soundCache[url].play();
  },

  playVoice(text, filename) {
    const url = `/audio/sfx/${filename}.mp3`;
    if (!this.checkDebounce(url, 500)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      onloaderror: () => {
        this.speakTTS(text);
      }
    });
    sound.play();
  },

  playQuestion(charObj) {
    const url = `/audio/chars/${charObj.char}_question.mp3`;
    if (!this.checkDebounce(url, 500)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      onloaderror: () => {
        this.speakTTS(`请找出 ${charObj.pinyin}，${charObj.example}的${charObj.char}`);
      }
    });
    sound.play();
  },

  playChar(char) {
    const url = `/audio/chars/${char}.mp3`;
    if (!this.checkDebounce(url, 200)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      onloaderror: () => {
        this.speakTTS(char);
      }
    });
    sound.play();
  },

  speakTTS(text) {
    if (!window.speechSynthesis) return;
    if (!this.checkDebounce('tts_' + text, 500)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; 
    utterance.rate = 0.9;     
    window.speechSynthesis.speak(utterance);
  }
};
```


【src/utils/preload.js】
```js
// 预加载图片
export const preloadImages = (urls) => {
  return Promise.all(urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = resolve; // 即使失败也不阻塞
    });
  }));
};

// [Day5] 预加载音频
// 使用 fetch 触发浏览器缓存，或者 Howler 预加载
export const preloadAudio = (urls) => {
  return Promise.all(urls.map(url => {
    return fetch(url).then(res => {
      if (res.ok) return res.blob();
    }).catch(() => {});
  }));
};
```


【src/util/effects.vue】
```js
import confetti from 'canvas-confetti';

export const effects = {
  // [Day9] 震动反馈 (仅支持的设备)
  vibrate(pattern = 10) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // 部分浏览器需要用户交互后才能震动，且 pattern 可以是数组 [震, 停, 震]
      navigator.vibrate(pattern);
    }
  },

  // 答对特效
  playSuccess(x = 0.5, y = 0.5) {
    this.vibrate(10); // 轻微震动
    
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x, y },
      colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
      disableForReducedMotion: true,
      zIndex: 1000
    });
  },
  
  // 答错特效
  playError() {
    this.vibrate([50, 50, 50]); // 震动两下
  },

  // 连击特效
  playStreak() {
    this.vibrate(20);
    const end = Date.now() + 500;
    const colors = ['#ff0000', '#ffa500'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        zIndex: 1000
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        zIndex: 1000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  },

  // 通关特效
  playWin() {
    this.vibrate([100, 50, 100]);
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 1000
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 1000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }
};
```