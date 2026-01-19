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

// 定时器管理池
const timers = [];
// [修复] 增加一个播放锁，防止 onMounted 意外触发两次
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

  // 1. 启动火车与汽笛
  timers.push(setTimeout(() => {
    startAnimation.value = true;
    audio.playSFX('whistle'); 
  }, 1000));

  // 2. 显示成绩单
  timers.push(setTimeout(() => {
    // [修复] 检查锁
    if (hasPlayedWin) return;
    hasPlayedWin = true;

    showScoreBoard.value = true;
    audio.playVoice('闯关成功！', 'win');
    effects.playWin();
  }, 3500));
});

// 离开页面时，清理所有未执行的定时器
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
  
  // [修复] 无限关卡逻辑
  // 只要下一关ID <= 比如 100，或者只要想玩就可以一直玩
  // 我们设定一个软上限，比如 500 关
  const MAX_LEVEL = 500; 
  
  // 或者更智能的判断：如果还有未掌握的汉字
  // 但为了简单，我们认为只要小于 MAX_LEVEL 就有下一关
  // 因为 game.js 会自动生成内容
  
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