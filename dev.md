前端代码如下：
【package.json】
```json
{
  "name": "hanzi-train",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --open",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vueuse/core": "^14.1.0",
    "axios": "^1.13.2",
    "canvas-confetti": "^1.9.4",
    "chart.js": "^4.5.1",
    "hanzi-writer": "^3.7.3",
    "howler": "^2.2.4",
    "idb-keyval": "^6.2.2",
    "pinia": "^3.0.4",
    "sass": "^1.97.0",
    "vue": "^3.5.24",
    "vue-chartjs": "^5.3.3",
    "vue-router": "^4.6.4",
    "vue-virtual-scroller": "^2.0.0-beta.8"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.1",
    "vite": "npm:rolldown-vite@7.2.5",
    "vite-plugin-compression": "^0.5.1",
    "vite-plugin-pwa": "^1.2.0"
  },
  "overrides": {
    "vite": "npm:rolldown-vite@7.2.5"
  }
}
```

【postcss.config.js】
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

【tailwind.config.js】
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```


【vite.config.js】
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'; // [Day8]

export default defineConfig({
  plugins: [
    vue(),
    // [Day8] 开启 Gzip 压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 超过10kb才压缩
      algorithm: 'gzip',
      ext: '.gz',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'images/**/*.png', 'images/**/*.svg', 'audio/sfx/*.mp3'],
      manifest: {
        name: '汉字小火车',
        short_name: '汉字火车',
        description: '专为儿童设计的游戏化识字应用',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/chars/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-chars-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                purgeOnQuotaError: true
              },
              cacheableResponse: { statuses: [0, 200] }
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          }
        ]
      }
    })
  ],
  // [Day8] 构建优化
  build: {
    chunkSizeWarningLimit: 1500, // 调大警告阈值 (hanzi-writer比较大)
    rollupOptions: {
      output: {
        // 手动代码分割，将大库拆分出去，防止 vendor.js 过大
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
          'vendor-charts': ['chart.js', 'vue-chartjs'],
          'vendor-hanzi': ['hanzi-writer'],
          'vendor-utils': ['canvas-confetti', 'howler', 'idb-keyval', 'axios']
        }
      }
    }
  }
})
```


【index.html】
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>汉字小火车</title>
    <!-- [Day9] PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    <!-- 禁止 iOS 缩放 -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```


【src/App.vue】
```vue
<template>
  <OrientationCheck />
  <!-- [Day9] 页面转场 -->
  <!-- <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in" >
      <component :is="Component" :key="$route.path" />
    </transition>
  </router-view> -->
  <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component" :key="$route.fullPath" />
    </transition>
  </router-view>

  <!-- [Day6] 全局成就弹窗 -->
  <AchievementToast ref="toastRef" />
  <InstallPrompt /> <!-- [Day8] -->
</template>

<script setup>
import { ref, watch } from 'vue';
import { useUserStore } from './stores/user';
import OrientationCheck from './components/common/OrientationCheck.vue';
import AchievementToast from './components/common/AchievementToast.vue';
import InstallPrompt from './components/common/InstallPrompt.vue';

const userStore = useUserStore();
const toastRef = ref(null);

watch(() => userStore.newAchievementsQueue.length, (newVal) => {
  if (newVal > 0) {
    const ach = userStore.consumeAchievement();
    if (ach && toastRef.value) {
      toastRef.value.show(ach);
    }
  }
});
</script>


<style>
/* [Day9] 全局转场动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

【src/main.js】
```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user' // [Day7]

// [Day4] 引入虚拟滚动
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'


// [Day9] 简单的 Ripple 指令实现
const ripple = {
  mounted(el) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.addEventListener('click', (e) => {
      const circle = document.createElement('span');
      const diameter = Math.max(el.clientWidth, el.clientHeight);
      const radius = diameter / 2;
      const rect = el.getBoundingClientRect();
      
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple');
      
      const rippleEl = el.getElementsByClassName('ripple')[0];
      if (rippleEl) {
        rippleEl.remove();
      }
      el.appendChild(circle);
    });
  }
};

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueVirtualScroller) // [Day4] 注册
app.directive('ripple', ripple) // 注册指令

// [Day7] 启动前初始化数据
const userStore = useUserStore()
userStore.init().then(() => {
  // 数据加载完成后再挂载应用，防止页面闪烁（从空数据变有数据）
  // 也可以先挂载，让页面显示 Loading 状态
  app.mount('#app')
})
```
【src/style.css】
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
  overflow: hidden; /* 禁止整个页面滚动 */
  overscroll-behavior: none; /* 禁止橡皮筋 */
  background-color: #f0f9ff;
  font-family: "KaiTi", "STKaiti", "Microsoft YaHei", sans-serif;
}

#app {
  height: 100%;
}

/* 禁止长按选中文本/图片 */
* {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent; /* 去除移动端点击高亮 */
  touch-action: manipulation; /* 优化触摸响应 */
}

/* 允许输入框选中 */
input {
  -webkit-user-select: auto;
  user-select: auto;
}

/* 按钮点击反馈优化 */
button:active {
  transform: scale(0.95);
}

/* [Day9] Ripple 动画 */
span.ripple {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple 600ms linear;
  background-color: rgba(255, 255, 255, 0.4); /* 白色半透明 */
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

【src/view/Result.vue】
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
```

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
```
【src/view/Garage.vue】
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
【src/view/Home.vue】
```vue
<template>
  <div class="h-screen w-screen overflow-hidden relative bg-gray-100 font-kaiti">
    <!-- 顶部信息栏 -->
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
    <!-- [Day8] 连胜显示 -->
    <DailyStreak />
    <!-- 章节地图 (横向滚动) -->
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
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>

        <!-- 章节标题 -->
        <div class="relative z-10 text-center mb-10 transform transition hover:scale-105 duration-300">
          <h2 class="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest">
            {{ chapter.name }}
          </h2>
          <div v-if="isLocked(chapter)" class="mt-4 text-white/90 bg-black/40 px-6 py-2 rounded-full inline-block font-bold backdrop-blur-sm border border-white/20">
            🔒 需要 {{ Math.ceil(chapter.minStars) }} 颗星星
          </div>
        </div>

        <!-- 关卡网格 -->
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

              <!-- 星星 -->
              <div v-if="getLevelStars(lvlId) > 0" class="absolute -top-3 w-full flex justify-center space-x-0.5">
                <span v-for="n in 3" :key="n" class="text-xs md:text-sm" :class="n <= getLevelStars(lvlId) ? 'text-yellow-400 drop-shadow' : 'text-gray-300'">★</span>
              </div>

              <!-- 当前指示 -->
              <div v-if="lvlId === userStore.progress.maxLevel" class="absolute inset-0 border-4 border-white rounded-full animate-ping opacity-50"></div>
            </button>
          </div>
        </div>

        <!-- 左右切换提示 -->
        <div class="absolute bottom-10 animate-bounce text-white/80 text-lg font-bold flex items-center gap-4">
          <span>←</span> 滑动切换章节 <span>→</span>
        </div>
      </div>
    </div>
    <!-- <StoryOverlay ref="storyRef" :script="currentStoryScript" @finish="onStoryFinish" /> -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import chaptersData from '../data/chapters.json';
import DailyStreak from '../components/common/DailyStreak.vue';
// import StoryOverlay from '../components/common/StoryOverlay.vue';
// import storyData from '../data/story.json';

const router = useRouter();
const userStore = useUserStore();

// [核心逻辑] 无限章节生成 (保留 Day 3 的逻辑)
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
const pendingLevelId = ref(null); // 暂存要跳转的关卡
const enterLevel = (lvlId, chapter) => {
  if (isLevelLocked(lvlId, chapter)) return;
  // if (storyData[lvlId] && storyData[lvlId].trigger === 'pre') {
  //     currentStoryScript.value = {
  //         ...storyData[lvlId],
  //         id: lvlId
  //     };
  //     pendingLevelId.value = lvlId;
  //     storyRef.value.start(); // 启动剧情
  //     return;
  // }

  unlockAudio();
  audio.playSFX('correct');
  router.push(`/game/${lvlId}`);
};

// // 剧情播放完毕的回调
// const onStoryFinish = () => {
//     if (pendingLevelId.value) {
//         audio.playSFX('correct');
//         router.push(`/game/${pendingLevelId.value}`);
//         pendingLevelId.value = null;
//     }
// };

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
【src/view/Parent.vue】
```vue
<template>
  <!-- [修复] h-screen overflow-y-auto 允许整个页面滚动 -->
  <div class="h-screen overflow-y-auto bg-gray-50 flex flex-col items-center p-4 md:p-6 font-kaiti">
    
    <!-- 锁屏界面 (保持不变) -->
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

    <!-- 已解锁：家长控制面板 -->
    <!-- [修复] mb-10 留出底部空间 -->
    <div v-else class="w-full max-w-4xl animate-fade-in mb-10">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">👨‍👩‍👧 家长中心</h1>
        <button @click="$router.push('/')" class="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold hover:bg-gray-300 transition">
          退出
        </button>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- 左侧 -->
        <div class="space-y-6">
          <!-- 概览 -->
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
            
            <!-- 图表 -->
            <div class="mt-6 pt-6 border-t border-gray-100">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-gray-700">近7天学习趋势</h4>
              </div>
              <LearningChart :history="userStore.history" />
            </div>
          </div>
           <!-- 学习建议 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-green-500 pl-3">学习建议</h3>
            <p class="text-gray-600 text-sm leading-relaxed" v-if="userStore.statsCount.total < 10">
              孩子刚刚起步，建议每天坚持玩 10 分钟，多给予口头鼓励。
            </p>
            <p class="text-gray-600 text-sm leading-relaxed" v-else>
              掌握情况非常棒！可以尝试挑战更高难度的关卡。
            </p>
          </div>
          <!-- [Day5] 云同步 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
            <h3 class="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <span>☁️</span> 云端同步
            </h3>
            
            <!-- 未登录 -->
            <div v-if="!userProfile" class="flex flex-col gap-3">
              <input v-model="form.username" type="text" placeholder="用户名" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <input v-model="form.password" type="password" placeholder="密码" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <div class="flex gap-2">
                <button @click="handleLogin" class="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600">登录</button>
                <button @click="handleRegister" class="flex-1 bg-white text-blue-500 border border-blue-500 py-2 rounded-lg font-bold hover:bg-blue-50">注册</button>
              </div>
            </div>

            <!-- 已登录 -->
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

          <!-- 设置 -->
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
        
        <!-- 右侧 -->
        <div class="space-y-6">
          <!-- [Day1] 学习计划干预 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100">
            <h3 class="text-lg font-bold text-yellow-600 mb-4 flex items-center gap-2"><span>📅</span> 学习计划干预</h3>
            <ParentSettings />
          </div>

          <!-- 数据管理 -->
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

// Auth
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
【src/view/ParentSettings.vue】
```vue
<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4 text-gray-700">课程编排 (定制关卡)</h2>

    <!-- 添加表单 -->
    <div class="bg-gray-50 p-4 rounded-xl mb-6 border">
      <div class="flex gap-2 mb-2">
        <div class="flex flex-col w-24">
          <label class="text-xs text-gray-500 font-bold mb-1">关卡号</label>
          <input v-model.number="form.level" type="number" class="border p-2 rounded" placeholder="如: 6" />
        </div>
        <div class="flex flex-col flex-1">
          <label class="text-xs text-gray-500 font-bold mb-1">汉字列表 (逗号分隔)</label>
          <input v-model="form.charsStr" class="border p-2 rounded" placeholder="如: 天,地,人" />
        </div>
      </div>
      <button @click="savePlan" class="bg-blue-500 text-white w-full py-2 rounded font-bold hover:bg-blue-600 transition" :disabled="loading">
        {{ loading ? '保存中...' : '保存关卡配置' }}
      </button>
    </div>

    <!-- 列表展示 -->
    <div v-if="plans.length > 0">
      <h3 class="font-bold text-gray-600 mb-2">已定制关卡</h3>
      <div class="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        <div v-for="p in plans" :key="p.id" class="bg-white border rounded-lg p-3 flex justify-between items-center shadow-sm">
          <div>
            <span class="font-bold text-blue-600 mr-2">第 {{ p.target_level }} 关</span>
            <span class="text-gray-600 text-sm">{{ p.chars.join('、') }}</span>
            <span v-if="p.is_used" class="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">已学</span>
          </div>
          <button @click="deletePlan(p.target_level)" class="text-red-400 hover:text-red-600 px-2">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="text-center text-gray-400 py-4 text-sm">
      暂无定制计划，系统将自动生成题目。
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../utils/api'; // 使用包含拦截器的 api 实例
import { auth } from '../utils/api'; // 或者直接用 auth

const loading = ref(false);
const form = ref({ level: '', charsStr: '' });
const plans = ref([]);

const fetchPlans = async () => {
  try {
    plans.value = await auth.getCustomPlans();
  } catch (e) {
    console.error(e);
  }
};

const savePlan = async () => {
  if (!form.value.level || !form.value.charsStr) return;

  const chars = form.value.charsStr.split(/[,，\s]+/).filter(s => s);
  if (chars.length === 0) return;

  loading.value = true;
  try {
    await auth.addCustomPlan(form.value.level, chars);
    await fetchPlans();
    form.value.charsStr = '';
    // form.value.level++; // 自动加1方便录入
    alert('保存成功！');
  } catch (e) {
    alert('保存失败');
  } finally {
    loading.value = false;
  }
};

const deletePlan = async (lvl) => {
  if (!confirm('确定删除吗？')) return;
  try {
    await auth.deleteCustomPlan(lvl);
    await fetchPlans();
  } catch (e) {
    alert('删除失败');
  }
};

onMounted(fetchPlans);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
</style>
```
【src/view/Print.vue】
```vue
<template>
  <!-- [修复] 外层 h-screen + overflow-y-auto 解决滚动问题 -->
  <!-- print:h-auto 确保打印时高度自动 -->
  <div class="h-screen overflow-y-auto bg-gray-100 p-4 md:p-8 font-kaiti print:bg-white print:p-0 print:h-auto print:overflow-visible">
    
    <!-- 顶部导航 -->
    <div class="flex justify-between items-center mb-6 max-w-[210mm] mx-auto print:hidden">
      <h1 class="text-2xl font-bold text-gray-800">🖨️ 字帖打印中心</h1>
      <div class="flex gap-2">
        <button @click="$router.push('/parent')" class="bg-gray-200 px-4 py-2 rounded font-bold hover:bg-gray-300 text-sm">返回</button>
        <button @click="print" class="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">
          <span>🖨️</span> 打印
        </button>
      </div>
    </div>

    <!-- 选项区 -->
    <div class="bg-white p-6 rounded-xl shadow-sm mb-8 max-w-[210mm] mx-auto print:hidden border border-gray-200">
      <h3 class="font-bold mb-4 text-gray-700">内容选择</h3>
      <div class="flex flex-wrap gap-6">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="recent" class="w-5 h-5 text-blue-600">
          <span>最近学习 (8字)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="hard" class="w-5 h-5 text-blue-600">
          <span>易错字 (8字)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="all" class="w-5 h-5 text-blue-600">
          <span>所有已掌握 (20字)</span>
        </label>
      </div>
    </div>

    <!-- 字帖纸张 (A4) -->
    <!-- [修复] flex-col items-center 确保内容在纸张正中间 -->
    <div id="print-area" class="bg-white shadow-2xl mx-auto flex flex-col items-center print:shadow-none print:w-full print:block">
      
      <!-- 页眉 -->
      <div class="text-center border-b-2 border-black pb-2 mb-6 pt-4 w-full">
        <h2 class="text-3xl font-bold tracking-widest">汉字描红练习</h2>
        <div class="flex justify-between px-4 mt-2 text-sm text-gray-500 w-full">
           <span>姓名：__________</span>
           <span>日期：__________</span>
           <span>得分：__________</span>
        </div>
      </div>

      <!-- 汉字行循环 -->
      <div v-for="char in charsToPrint" :key="char" class="flex justify-center items-center mb-3 page-break-item w-full">
        
        <!-- 左侧示范字 (带拼音) -->
        <div class="flex flex-col items-center mr-4 flex-shrink-0">
          <div class="text-lg font-mono mb-0.5 font-bold text-gray-600 h-6">{{ getPinyin(char) }}</div>
          
          <div class="char-box border-2 border-red-500 relative flex items-center justify-center bg-red-50">
            <div class="grid-lines"></div>
            <span class="text-5xl font-kaiti z-10">{{ char }}</span>
          </div>
        </div>

        <!-- 右侧练习字 (8个) -->
        <!-- [修复] pt-6 对齐拼音的高度占位 -->
        <div class="flex gap-2 pt-6">
          <div v-for="n in 8" :key="n" class="char-box border border-green-600 relative flex items-center justify-center">
            <div class="grid-lines-green"></div>
            <!-- 前3个描红 -->
            <span v-if="n <= 3" class="text-5xl text-gray-300 font-kaiti z-10 opacity-50" style="-webkit-text-stroke: 1px #ccc; color: transparent;">{{ char }}</span>
          </div>
        </div>

      </div>

      <!-- 空状态 -->
      <div v-if="charsToPrint.length === 0" class="text-center text-gray-400 py-20 w-full">
        <div class="text-6xl mb-4">📭</div>
        没有符合条件的汉字
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/user';
import charsData from '../data/characters.json';

const userStore = useUserStore();
const mode = ref('recent'); 

const getPinyin = (char) => {
  const obj = charsData.find(c => c.char === char);
  return obj ? obj.pinyin : '';
};

const charsToPrint = computed(() => {
  const allChars = userStore.characters;
  const entries = Object.entries(allChars);
  
  if (entries.length === 0) return [];

  if (mode.value === 'recent') {
    return entries.sort((a, b) => b[1].lastTime - a[1].lastTime).slice(0, 8).map(e => e[0]);
  }
  if (mode.value === 'hard') {
    return entries.filter(e => e[1].wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 8).map(e => e[0]);
  }
  // all
  return Object.keys(allChars).filter(char => allChars[char].level >= 4).slice(0, 20);
});

const print = () => {
  window.print();
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }

/* A4 容器 */
#print-area {
  width: 210mm;
  padding: 15mm; /* 增加边距，让内容更聚拢 */
  box-sizing: border-box;
  min-height: 297mm;
}

/* 格子尺寸: 18mm */
/* 一行: 1示范 + 6练习 = 7个 */
/* 宽度: 7*18 + 6*2(gap) + 16(gap大) ≈ 154mm */
/* 210mm - 30mm(padding) = 180mm > 154mm，完美居中 */
.char-box {
  width: 18mm;
  height: 18mm;
  position: relative;
  box-sizing: border-box;
}

/* 辅助线 */
.grid-lines::before, .grid-lines::after {
  content: ''; position: absolute; background: #fca5a5;
}
.grid-lines::before { top: 50%; left: 0; width: 100%; height: 1px; }
.grid-lines::after { left: 50%; top: 0; height: 100%; width: 1px; }

.grid-lines-green::before, .grid-lines-green::after {
  content: ''; position: absolute; border-color: #86efac; border-style: dashed; border-width: 0;
}
.grid-lines-green::before { top: 50%; left: 0; width: 100%; border-top-width: 1px; }
.grid-lines-green::after { left: 50%; top: 0; height: 100%; border-left-width: 1px; }

@media print {
  @page { size: A4; margin: 0; }
  body { background: white; -webkit-print-color-adjust: exact; }
  .print\:hidden { display: none !important; }
  .shadow-2xl { box-shadow: none !important; }
  .page-break-item { break-inside: avoid; }
  
  #print-area {
    width: 100% !important;
    padding: 10mm !important;
    margin: 0 auto !important;
    display: block !important; /* 打印时由浏览器控制流 */
  }
}
</style>
```
【src/view/Reading.vue】
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
【src/router/index.js】
```js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Game from '../views/Game.vue';
import Result from '../views/Result.vue';
import Parent from '../views/Parent.vue';
import Garage from '../views/Garage.vue'; // [Day6] 引入 Garage
import Print from '../views/Print.vue';
import Reading from '../views/Reading.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/game/:levelId', name: 'Game', component: Game, props: true },
  { path: '/result', name: 'Result', component: Result },
  { path: '/parent', name: 'Parent', component: Parent },
  { path: '/print', name: 'Print', component: Print },
  { path: '/reading', name: 'Reading', component: Reading },
  { path: '/garage', name: 'Garage', component: Garage } // [Day6] 添加路由
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```


【src/view/Game.vue】
```vue

【src/stores/game.js】
```js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth } from '../utils/api'; // [Day2] 引入 API
import chaptersData from '../data/chapters.json';
import { audio } from '../utils/audio';
import { preloadAudio } from '../utils/preload';
import { useUserStore } from './user';
import { useRouter } from 'vue-router';
import { effects } from '../utils/effects';

export const useGameStore = defineStore('game', () => {
  const userStore = useUserStore();
  const router = useRouter();

  // State
  const currentLevelConfig = ref(null);
  const currentChapter = ref(null);
  const currentStoryScript = ref(null); 
  const questions = ref([]);
  const currentIndex = ref(0);
  const score = ref(0);
  const streak = ref(0);
  const isGameActive = ref(false);
  const userInteracted = ref(false);
  const isProcessing = ref(false);
  
  const collectedCarriages = ref([]); 
  const resultData = ref(null);
  const sessionRecords = ref({});
  const totalClicks = ref(0);

  const currentSkill = ref(null);
  const skillUsed = ref(false);
  const shieldActive = ref(false);
  
  const timeLimit = ref(0);
  const timeRemaining = ref(0);
  const timerId = ref(null);

  const currentFillIndex = ref(0); 
  const currentFilledChars = ref([]); 

  const transitionTimers = []; 
  let lastPlayTime = 0;

  const currentQuestion = computed(() => {
    if (!questions.value || questions.value.length === 0) return null;
    return questions.value[currentIndex.value];
  });
  
  const progressPercent = computed(() => {
    if (!questions.value.length) return 0;
    return ((currentIndex.value) / questions.value.length) * 100;
  });

  // --- Actions ---

  function clearAllTimers() {
    stopTimer();
    transitionTimers.forEach(id => clearTimeout(id));
    transitionTimers.length = 0;
  }

  function exitGame() {
    clearAllTimers();
    isGameActive.value = false;
    isProcessing.value = false;
  }

  // [Day8 修复] 完整的 AI 获取与兜底函数
  async function fetchAiScenario(levelId, questionsList) {
      // 1. 尝试 AI
      try {
          const chars = questionsList.map(q => q.targetChars.map(c => c.char)).flat();
          const uniqueChars = [...new Set(chars)].slice(0, 5);
          if (uniqueChars.length === 0) return null;

          const scenario = await auth.generateScenario(Number(levelId), uniqueChars);
          if (scenario && scenario.dialogs && scenario.dialogs.length > 0) {
              return {
                  trigger: 'pre',
                  background: scenario.background || 'bg-blue-500',
                  dialogs: scenario.dialogs,
                  id: `ai_${levelId}`
              };
          }
      } catch (e) {
          console.warn('AI scenario skipped:', e.message);
      }
      
      // 2. [Day8] 本地兜底逻辑
      // 如果 AI 失败，或者没返回有效数据，使用本地模板
      // 这样保证剧情模式的连续性
      const charsStr = questionsList.slice(0, 3).map(q => q.targetChars[0].char).join('、');
      return {
          trigger: 'pre',
          background: 'bg-indigo-600',
          id: `fallback_${levelId}`,
          dialogs: [
              { role: 'conductor', name: '列车长', text: `前方到达第 ${levelId} 关！`, emotion: 'happy' },
              { role: 'conductor', name: '列车长', text: `我们要收集 [${charsStr}] 这些能量块。`, emotion: 'normal' },
              { role: 'conductor', name: '列车长', text: '大家准备好了吗？出发！', emotion: 'happy' }
          ]
      };
  }

  async function initLevel(levelId) {
    console.log(`[Game] Init level (Server): ${levelId}`);
    clearAllTimers();
    isProcessing.value = false;
    isGameActive.value = true;
    currentFillIndex.value = 0;
    currentFilledChars.value = [];

    try {
        // [Day2] 调用后端 API
        const data = await auth.initLevel(Number(levelId));
        console.log('game.js->',data)
        currentLevelConfig.value = {
            levelId: data.levelId, // 确保后端返回了 levelId
            difficulty: { timeLimit: data.timeLimit }
        };
        resetGameState(); // [关键]
        initSkill();
        // 应用后端返回的数据
        questions.value = data.questions;
        timeLimit.value = data.timeLimit || 0;

        // 章节配置 (前端保留，或者后端也返回)
        // 简单起见，前端根据 levelId 算一下
        const chapIdx = Math.floor((levelId - 1) / 20) % chaptersData.length;
        currentChapter.value = chaptersData[chapIdx];

        // 音频预加载
        triggerAudioPreload(questions.value);

        return true;
    } catch (e) {
        console.error('Level Init Failed', e);
        alert('无法连接服务器获取关卡');
        return false;
    }
  }

  function triggerAudioPreload(questionsList) {
      const audioUrls = new Set();
      questionsList.forEach(q => {
          if (q.targetChar && q.targetChar.char) {
             audioUrls.add(`/audio/chars/${q.targetChar.char}_question.mp3`);
          }
          q.options.forEach(opt => {
              if (opt.char) audioUrls.add(`/audio/chars/${opt.char}.mp3`);
          });
      });
      preloadAudio(Array.from(audioUrls));
  }

  async function fetchDetails(idsOrChars) {
      const promises = idsOrChars.map(id => userStore.getCharDetail(id));
      const results = await Promise.all(promises);
      
      return results.map((res, index) => {
          if (res) return res;
          const originalInput = idsOrChars[index];
          let charStr = originalInput;
          if (originalInput.startsWith('h_')) {
              const found = charsIndex.find(c => c.id === originalInput);
              if (found) charStr = found.char;
          }
          return { id: originalInput, char: charStr, pinyin: '' };
      }).filter(item => item && item.char); 
  }

  function resetGameState() {
    score.value = 0;
    streak.value = 0;
    currentIndex.value = 0;
    isGameActive.value = true;
    userInteracted.value = false;
    isProcessing.value = false;
    collectedCarriages.value = [];
    sessionRecords.value = {};
    totalClicks.value = 0;
  }

  function initSkill() {
    const trainId = userStore.currentTrainId;
    if (trainId === 'diesel') currentSkill.value = 'hint';
    else if (trainId === 'electric') currentSkill.value = 'shield';
    else currentSkill.value = null;
    skillUsed.value = false;
    shieldActive.value = false;
  }

  function buildQuestionsFromChars(targetCharObjs, difficulty) {
    const qList = [];
    const shuffledTargets = [...targetCharObjs].sort(() => Math.random() - 0.5);
    shuffledTargets.forEach(target => {
      const optionsWithState = generateOptions(target, difficulty).map(opt => ({
        ...opt,
        state: 'normal'
      }));
      qList.push({ 
          isWord: false, 
          targetChar: target, 
          targetChars: [target], 
          options: optionsWithState, 
          status: 'pending', 
          isReview: false 
      });
    });
    return qList;
  }

  function generateOptions(target, difficulty) {
    const pool = charsIndex.filter(c => c.char !== target.char);
    const maxOptions = 6;
    const configCount = Math.min(difficulty.optionCount, maxOptions);
    const count = Math.min(pool.length, configCount - 1);
    const distractors = pool.sort(() => Math.random() - 0.5).slice(0, count);
    return [...distractors, target].sort(() => Math.random() - 0.5);
  }

  function startTimer() {
    stopTimer();
    if (timeLimit.value <= 0) return;
    timeRemaining.value = timeLimit.value;
    timerId.value = setInterval(() => {
      timeRemaining.value--;
      if (timeRemaining.value <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId.value) {
      clearInterval(timerId.value);
      timerId.value = null;
    }
  }

  function handleTimeout() {
    if (!isGameActive.value || isProcessing.value) return;
    totalClicks.value++;
    handleWrong(currentQuestion.value.targetChar);
    currentQuestion.value.options.forEach(opt => {
      if (opt.char !== currentQuestion.value.targetChar.char) opt.state = 'wrong';
    });
  }

  function playQuestionAudio() {
    const now = Date.now();
    if (now - lastPlayTime < 1000) return;
    lastPlayTime = now;

    const q = currentQuestion.value;
    if (!q) return;

    if (q.isWord) {
        // 词语模式：播放 TTS
        const text = `请拼出：${q.targetText}`;
        audio.speakTTS(text);
    } else {
        // 单字模式：播放 MP3
        // [修复] 增加空值检查
        if (q.targetChar) {
            audio.playQuestion(q.targetChar);
        } else if (q.targetChars && q.targetChars[0]) {
            // 兼容性处理：如果只有 targetChars
            audio.playQuestion(q.targetChars[0]);
        }
    }
    startTimer();
  }

  function submitAnswer(selectedOption) {
    if (!isGameActive.value || isProcessing.value || selectedOption.state === 'wrong') return false;
    userInteracted.value = true;
    totalClicks.value++;

    const q = currentQuestion.value;
    const currentTarget = q.targetChars[currentFillIndex.value];
    
    if (selectedOption.char === currentTarget.char) {
        selectedOption.state = 'correct'; 
        audio.playSFX('correct'); 
        currentFilledChars.value.push(selectedOption);
        currentFillIndex.value++;
        
        if (!q.isReview) {
            const charStr = currentTarget.char;
            if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = true;
        }
        
        if (currentFillIndex.value >= q.targetChars.length) {
            isProcessing.value = true;
            handleCorrect(); 
        }
        return true;
    } else {
        if (shieldActive.value) {
            shieldActive.value = false;
            selectedOption.state = 'wrong';
            audio.playSFX('attach'); 
            totalClicks.value--;
            return false; 
        }
        
        selectedOption.state = 'wrong';
        audio.playSFX('wrong');
        
        if (q.targetChars.length === 1) {
             if (!q.isReview) {
                const charStr = q.targetChars[0].char;
                if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = false;
            }
            handleWrong(q.targetChar);
        }
        
        return false;
    }
  }

  function handleCorrect() {
    stopTimer();
    audio.playVoice('太棒了！', 'great'); 
    
    transitionTimers.push(setTimeout(() => { 
        audio.playSFX('correct'); 
    }, 1000)); 
    
    streak.value++;
    score.value += 10 + (streak.value > 3 ? 5 : 0);
    
    currentFillIndex.value = 0;
    currentFilledChars.value = [];
    
    transitionTimers.push(setTimeout(() => {
      const q = currentQuestion.value;
      q.targetChars.forEach(c => {
          collectedCarriages.value.push({ char: c.char, type: streak.value >= 5 ? 'golden' : 'normal', id: Date.now() + Math.random() });
      });
      audio.playSFX('attach');
    }, 1500));
    
    transitionTimers.push(setTimeout(() => { 
        isProcessing.value = false; 
        nextQuestion(); 
    }, 2500));
  }

  function handleWrong(targetChar) {
    stopTimer();
    audio.playSFX('wrong');
    transitionTimers.push(setTimeout(() => { 
        audio.playVoice('不对哦，再试一次', 'try_again'); 
    }, 800));
    
    streak.value = 0;
    const currentQ = currentQuestion.value;
    if (!currentQ.isReview) {
      const reviewQ = JSON.parse(JSON.stringify(currentQ));
      reviewQ.isReview = true; 
      reviewQ.options.forEach(o => o.state = 'normal');
      questions.value.push(reviewQ);
    }
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++;
      playQuestionAudio();
    } else {
      finishGame();
    }
  }

  function useSkill() {
    if (skillUsed.value || !currentSkill.value) return false;
    if (currentSkill.value === 'hint') {
      const targetChar = currentQuestion.value.targetChar.char;
      const wrongOption = currentQuestion.value.options.find(o => o.char !== targetChar && o.state === 'normal');
      if (wrongOption) {
        wrongOption.state = 'wrong';
        skillUsed.value = true;
        audio.playSFX('correct');
        return true;
      }
    } else if (currentSkill.value === 'shield') {
      shieldActive.value = true;
      skillUsed.value = true;
      audio.playSFX('correct'); 
      return true;
    }
    return false;
  }

  function finishGame() {
    if (!isGameActive.value) return;
    clearAllTimers(); 
    audio.stopAll();
    isGameActive.value = false;
    isProcessing.value = false;
    
    const results = Object.entries(sessionRecords.value).map(([char, isCorrect]) => ({
      char,
      isCorrect
    }));
    userStore.batchUpdateChars(results);

    const passCount = collectedCarriages.value.length;
    let accuracy = 0;
    if (totalClicks.value > 0) accuracy = passCount / totalClicks.value;
    
    let stars = 1;
    if (accuracy >= 0.9) stars = 3;
    else if (accuracy >= 0.7) stars = 2;
    
    resultData.value = {
      levelId: currentLevelConfig.value.levelId,
      score: score.value,
      stars: stars,
      carriages: JSON.parse(JSON.stringify(collectedCarriages.value))
    };
    if (collectedCarriages.value.length > 0) userStore.recordLearning(collectedCarriages.value.length);
    userStore.updateProgress(currentLevelConfig.value.levelId, stars, score.value);
    userStore.checkAchievements();
    
    collectedCarriages.value.forEach(item => {
        if (userStore.priorityList.includes(item.char)) {
            userStore.removePriorityChar(item.char);
        }
    });

    router.replace('/result');
  }

  return {
    currentLevelConfig, currentChapter, currentQuestion, currentIndex, score, streak,
    collectedCarriages, resultData, progressPercent, currentSkill, skillUsed, shieldActive,
    useSkill, timeLimit, timeRemaining, startTimer, stopTimer, initLevel, submitAnswer, playQuestionAudio, exitGame,
    currentStoryScript, currentFillIndex, currentFilledChars
  };
});
```
【src/stores/user.js】
```js
import { defineStore } from 'pinia';
import { db } from '../utils/db';
import achievementsData from '../data/achievements.json';
import { audio } from '../utils/audio';
import charsIndexRaw from '../data/chars_index.json';
import trainPartsData from '../data/train_parts.json';
import { auth } from '../utils/api'; 

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoaded: false,
    
    info: { name: '小小探险家', avatar: 'default' },
    progress: { currentLevel: 1, maxLevel: 1, totalStars: 0, totalScore: 0 },
    characters: {},
    history: [],
    trains: ['steam'],
    currentTrainId: 'steam',
    achievements: [],
    newAchievementsQueue: [],
    priorityList: [], // ['赢', '餐', '饕'] (存放 char)
    skippedChars: [], // ['一', '二'] (家长认为太简单跳过的)
    customCharacters: {},
    customConfigs: {}, // 用户自定义配置 { "人": { distractors: ["入", "八"] } }
    scenarioCache: {},
    settings: {
      showPinyin: true,
      showHanzi: true,
      bgmVolume: 0.3,
      sfxVolume: 1.0,
      hasSeenTutorial: false, // [Day9]
      scenarioCache: {}, 
    },

    unlockedParts: [],
    equippedParts: [],
    // 数据管理
    charsIndex: charsIndexRaw,
    charsDetailCache: {},
  }),

  getters: {
    statsCount(state) {
      let master = 0, learning = 0;
      Object.values(state.characters).forEach(c => {
        if (c.level >= 4) master++;
        else learning++;
      });
      return { master, learning, total: master + learning };
    },

    reviewList(state) {
      const now = Date.now();
      return Object.entries(state.characters)
        .filter(([char, record]) => {
          return record.nextReviewTime > 0 && record.nextReviewTime <= now && record.level < 5;
        })
        .map(([char]) => char);
    }
  },

  actions: {
    async init() {
      if (this.isLoaded) return;
      try {
        const [
            info, progress, characters, history, trains, currentTrainId, 
            achievements, settings, unlockedParts, equippedParts,
            lastPlayDate, dailyStreak, checkInDates, customConfigs, scenarioCache
        ] = await Promise.all([
          db.get('user_info'),
          db.get('user_progress'),
          db.get('user_characters'),
          db.get('user_history'),
          db.get('user_trains'),
          db.get('user_current_train'),
          db.get('user_achievements'),
          db.get('user_settings'),
          db.get('user_parts'),
          db.get('user_equipped_parts'),
          
          // [修复] 必须读取
          db.get('user_last_play_date'),
          db.get('user_daily_streak'),
          db.get('user_checkin_dates'),
          db.get('user_priority_list'),
          db.get('user_skipped_chars'),
          db.get('user_custom_chars'),
          db.get('user_custom_configs'),
          db.get('user_scenario_cache')
        ]);

        if (info) this.info = info;
        if (progress) this.progress = progress;
        if (characters) this.characters = characters;
        if (history) this.history = history;
        if (trains) this.trains = trains;
        if (currentTrainId) this.currentTrainId = currentTrainId;
        if (achievements) this.achievements = achievements;
        if (settings) this.settings = settings;
        if (unlockedParts) this.unlockedParts = unlockedParts;
        if (equippedParts) this.equippedParts = equippedParts;
        if (lastPlayDate) this.lastPlayDate = lastPlayDate;
        if (dailyStreak) this.dailyStreak = dailyStreak;
        if (this.settings) {
            audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
        }
        if (Array.isArray(checkInDates)) {
            this.checkInDates = checkInDates;
        } else {
            this.checkInDates = [];
        }
        if (customConfigs) this.customConfigs = customConfigs;
        this.isLoaded = true;
        console.log('[UserStore] Data loaded from IndexedDB');
      } catch (e) {
        console.error('Failed to load user data', e);
      }
    },

    // [Day3] 更新单字配置
    updateCustomConfig(char, config) {
        if (!this.customConfigs[char]) this.customConfigs[char] = {};
        Object.assign(this.customConfigs[char], config);
        this.charsDetailCache = {};
        this.save();
    },

    async getCharDetail(idOrChar) {
      let detail = null;
      let char = '';

      // 1. 先查自定义新字库 (customCharacters)
      if (!idOrChar.startsWith('h_')) {
          char = idOrChar;
          if (this.customCharacters[char]) {
              detail = { ...this.customCharacters[char] }; // 复制一份
          }
      }

      // 2. 如果不是自定义字，去查 charsIndex 和分片文件
      if (!detail) {
          let id = idOrChar;
          if (!id.startsWith('h_')) {
              const found = this.charsIndex.find(c => c.char === id);
              if (!found) return null; // 没找到
              id = found.id;
              char = found.char;
          } else {
              // 如果传的是 ID，我们要反查 char，方便后续查 customConfigs
              // 这里如果缓存里有，直接取；如果 index 里有，取 char
              // 假设 charsIndex 包含所有 h_ 开头的
              const found = this.charsIndex.find(c => c.id === id);
              if (found) char = found.char;
          }

          // 查内存缓存
          if (this.charsDetailCache[id]) {
              // 注意：缓存里应该已经是合并过的了，直接返回
              return this.charsDetailCache[id];
          }

          // Fetch 分片
          const CHUNK_SIZE = 200;
          const numId = parseInt(id.split('_')[1]);
          const chunkIndex = Math.floor((numId - 1) / CHUNK_SIZE);

          try {
            // 这里有个小问题：如果多次请求同一个 chunk，会有并发请求。
            // 但浏览器会自动合并相同 URL 请求，所以问题不大。
            const res = await fetch(`/data/chars_detail_${chunkIndex}.json`);
            if (!res.ok) throw new Error('Network error');
            const chunkData = await res.json();
            
            // 写入缓存前，先不合并，因为我们要针对单个字合并 customConfig
            // 但为了性能，我们通常把整个 chunk 塞进 cache
            Object.assign(this.charsDetailCache, chunkData);
            
            // 取出当前字
            if (this.charsDetailCache[id]) {
                detail = { ...this.charsDetailCache[id] };
            }
          } catch (e) {
            console.error(e);
            return null;
          }
      }

      // [Day3] 3. 合并家长配置
      if (detail) {
          const custom = this.customConfigs[char]; // char 必须存在
          if (custom && custom.distractors) {
              // 确保结构存在
              if (!detail.confusingChars) detail.confusingChars = {};
              // 覆盖 hard，确保优先使用
              detail.confusingChars.hard = custom.distractors;
          }
          
          // 更新回缓存 (如果是普通字)
          if (detail.id && detail.id.startsWith('h_')) {
              this.charsDetailCache[detail.id] = detail;
          }
      }

      return detail;
    },

    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.save();
      if (newSettings.bgmVolume !== undefined || newSettings.sfxVolume !== undefined) {
          audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
      }
    },

    // [修复] 强制转数字比较
    updateProgress(levelId, stars, score) {
      const lvl = Number(levelId);
      if (!isNaN(lvl) && lvl === this.progress.maxLevel && stars > 0) {
        this.progress.maxLevel++;
      }
      this.progress.totalStars += stars;
      this.progress.totalScore += score;
      
      this.checkUnlockParts();
      
      this.save();
    },

    updateCharStatus(char, isCorrect) {
      if (!this.characters[char]) {
        this.characters[char] = {
          status: 'new', level: 0, nextReviewTime: 0,
          correct: 0, wrong: 0, streak: 0, lastTime: 0
        };
      }
      const record = this.characters[char];
      record.lastTime = Date.now();

      if (isCorrect) {
        record.correct++; record.streak++;
        if (record.level < 5) record.level++;
        const intervalMs = 10 * 1000; 
        record.nextReviewTime = Date.now() + intervalMs;
        if (record.level >= 4) record.status = 'mastered';
        else if (record.level >= 2) record.status = 'familiar';
        else record.status = 'learning';
      } else {
        record.wrong++; record.streak = 0; 
        record.level = Math.max(0, record.level - 2);
        record.status = 'learning';
        record.nextReviewTime = Date.now(); 
      }
      this.recordLearning(isCorrect ? 1 : 0);
      this.save();
    },
    
    batchUpdateChars(results) {
      results.forEach(item => this.updateCharStatus(item.char, item.isCorrect));
    },

    recordLearning(count = 1) {
      // 1. 获取今天的日期 YYYY-MM-DD
      // 注意：toISOString() 是 UTC 时间，如果你在中国(UTC+8)，可能会导致半夜变成前一天
      // 建议改用本地时间
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const today = new Date(d.getTime() - offset).toISOString().split('T')[0];
      
      // 更新历史图表数据 (这里只存 MM-DD)
      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry && lastEntry.date === today.slice(5)) { 
        lastEntry.count += count;
      } else {
        if (this.history.length >= 7) this.history.shift();
        this.history.push({ date: today.slice(5), count: count });
      }

      // [Day8 核心修复] 处理连胜逻辑
      // 确保 checkInDates 是数组
      if (!Array.isArray(this.checkInDates)) {
          // 如果旧数据是错的，尝试恢复或重置
          this.checkInDates = [];
      }

      if (this.lastPlayDate !== today) {
          // 计算昨天
          const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
          
          if (this.lastPlayDate === yesterday) {
              this.dailyStreak = (this.dailyStreak || 0) + 1;
          } else {
              this.dailyStreak = 1;
          }
          
          this.lastPlayDate = today;
          
          // 防止重复添加 (双保险)
          if (!this.checkInDates.includes(today)) {
              this.checkInDates.push(today);
          }
          
          if (this.checkInDates.length > 30) this.checkInDates.shift();
      }

      this.save();
    },

    checkUnlockTrains() {
        const totalStars = this.progress.totalStars;
        let unlockedId = null;
        if (totalStars >= 20 && !this.trains.includes('diesel')) {
            this.trains.push('diesel'); unlockedId = 'diesel';
        }
        if (totalStars >= 50 && !this.trains.includes('electric')) {
            this.trains.push('electric'); unlockedId = 'electric';
        }
        if (unlockedId) this.save();
        return unlockedId;
    },

    checkUnlockParts() {
      const totalChars = Object.keys(this.characters).length;
      let hasNew = false;
      
      trainPartsData.forEach(part => {
        if (!this.unlockedParts.includes(part.id)) {
          if (part.unlockType === 'chars' && totalChars >= part.unlockValue) {
            this.unlockedParts.push(part.id);
            hasNew = true;
            if (this.equippedParts.length < 3) {
                this.equippedParts.push(part.id);
            }
          }
        }
      });
      
      if (hasNew) this.save();
      return hasNew;
    },

    equipTrain(trainId) {
        if (this.trains.includes(trainId)) {
            this.currentTrainId = trainId; this.save();
        }
    },

    equipParts(partsList) {
      this.equippedParts = partsList;
      this.save();
    },

    checkAchievements(context = {}) {
        const newUnlocked = [];
        const stats = this.statsCount;
        achievementsData.forEach(ach => {
            if (this.achievements.includes(ach.id)) return;
            let isMet = false;
            const cond = ach.condition;
            switch (cond.type) {
            case 'level_pass': if (this.progress.maxLevel > cond.value) isMet = true; break;
            case 'streak': if (context.streak && context.streak >= cond.value) isMet = true; break;
            case 'master_chars': if (stats.master >= cond.value) isMet = true; break;
            case 'train_count': if (this.trains.length >= cond.value) isMet = true; break;
            }
            if (isMet) {
                this.achievements.push(ach.id); newUnlocked.push(ach);
            }
        });
        if (newUnlocked.length > 0) {
            this.save();
            this.newAchievementsQueue.push(...newUnlocked);
            return newUnlocked;
        }
    },
    
    consumeAchievement() { return this.newAchievementsQueue.shift(); },

    // [Day2] 打包当前数据
    serializeData() {
      return JSON.stringify({
        info: this.info,
        progress: this.progress,
        characters: this.characters,
        history: this.history,
        trains: this.trains,
        currentTrainId: this.currentTrainId,
        achievements: this.achievements,
        settings: this.settings,
        unlockedParts: this.unlockedParts,
        equippedParts: this.equippedParts,
        // 日期相关
        lastPlayDate: this.lastPlayDate,
        dailyStreak: this.dailyStreak,
        checkInDates: this.checkInDates,
        version: '4.0'
      });
    },
    // [Day2] 恢复数据
    async deserializeData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        // 恢复到 state
        if (data.info) this.info = data.info;
        if (data.progress) this.progress = data.progress;
        if (data.characters) this.characters = data.characters;
        if (data.history) this.history = data.history;
        if (data.trains) this.trains = data.trains;
        if (data.currentTrainId) this.currentTrainId = data.currentTrainId;
        if (data.achievements) this.achievements = data.achievements;
        if (data.settings) this.settings = data.settings;
        if (data.unlockedParts) this.unlockedParts = data.unlockedParts;
        if (data.equippedParts) this.equippedParts = data.equippedParts;
        if (data.lastPlayDate) this.lastPlayDate = data.lastPlayDate;
        if (data.dailyStreak) this.dailyStreak = data.dailyStreak;
        if (data.checkInDates) this.checkInDates = data.checkInDates;
        
        // 写入 IndexedDB
        this.save();
        alert('存档恢复成功！');
        window.location.reload(); // 刷新以确保状态一致
      } catch (e) {
        console.error('Deserialize failed', e);
        alert('存档文件损坏');
      }
    },
    // [Day2] 上传到云端
    async syncUpload() {
      try {
        const json = this.serializeData();
        await auth.uploadSave(json);
        alert('上传成功！');
        return true;
      } catch (e) {
        alert('上传失败: ' + e.message);
        return false;
      }
    },
    // [Day2] 从云端下载
    async syncDownload() {
      try {
        if (!confirm('确定要下载云端存档吗？这将覆盖当前进度。')) return;
        const res = await auth.downloadSave();
        await this.deserializeData(res.data);
      } catch (e) {
        alert('下载失败: ' + e.message);
      }
    },

    addPriorityChar(char) {
      if (!this.priorityList.includes(char)) {
        this.priorityList.push(char);
        this.save();
      }
    },
    
    // [Day1] 移除优先字 (学会后自动移除)
    removePriorityChar(char) {
      const idx = this.priorityList.indexOf(char);
      if (idx > -1) {
        this.priorityList.splice(idx, 1);
        this.save();
      }
    },
    
    // [Day1] 检查是否需要跳过 (用于 generateLevel)
    isSkipped(char) {
        return this.skippedChars.includes(char);
    },
    // 添加自定义字
    addCustomChar(charData) {
      this.customCharacters[charData.char] = charData;
      // 同时加入 charsDetailCache，让 getCharDetail 能查到
      this.charsDetailCache[`custom_${charData.char}`] = charData;
      
      this.save();
    },
    cacheScenario(levelId, script) {
      this.scenarioCache[levelId] = script;
      this.save();
    },

    save() {
        db.set('user_info', this.info);
        db.set('user_progress', this.progress);
        db.set('user_characters', this.characters);
        db.set('user_history', this.history);
        db.set('user_trains', this.trains);
        db.set('user_current_train', this.currentTrainId);
        db.set('user_achievements', this.achievements);
        db.set('user_settings', this.settings);
        db.set('user_parts', this.unlockedParts);
        db.set('user_equipped_parts', this.equippedParts);
        // [修复] 必须显式保存这三个字段
        db.set('user_last_play_date', this.lastPlayDate);
        db.set('user_daily_streak', this.dailyStreak);
        db.set('user_checkin_dates', this.checkInDates);
        db.set('user_priority_list', this.priorityList);
        db.set('user_skipped_chars', this.skippedChars);
        db.set('user_custom_chars', this.customCharacters);
        db.set('user_custom_configs', this.customConfigs);
        db.set('user_scenario_cache', this.scenarioCache);
    },

    async resetAllData() {
        await db.clearAll();
        window.location.reload();
    }
  }
});
```
【src/utils/api.js】
```js
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hanzi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
   async initLevel(levelId) {
    const res = await api.post('/game/init_level', { level_id: levelId });
    return res.data;
  },

  async register(username, password) {
    const res = await api.post('/register', { username, password });
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },
  
  async login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const res = await api.post('/token', params);
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },
  
  async getMe() {
    const res = await api.get('/users/me');
    return res.data;
  },
  
  logout() {
    localStorage.removeItem('hanzi_token');
  },

  // [Day2] 同步接口
  async uploadSave(jsonString) {
    const res = await api.post('/sync/upload', { data: jsonString });
    return res.data;
  },

  async downloadSave() {
    const res = await api.get('/sync/download');
    return res.data; // { data: "...", updated_at: "..." }
  },
   // [Day7] 生成故事
  async generateStory(knownChars) {
    const res = await api.post('/story/generate', { known_chars: knownChars });
    return res.data;
  },
  async generateScenario(level, chars) {
    try {
        // [Day8] 缩短超时到 3s，避免让用户等太久
        // 如果是预加载(后台跑)，可以长一点；如果是实时请求，必须短。
        // 我们统一设为 5s，因为现在主要靠预加载。
        const res = await api.post('/story/scenario', { level, chars }, { timeout: 5000 });
        return res.data;
    } catch (e) {
        console.warn('AI API Error:', e.message);
        return null; // 优雅降级
    }
  },
  // [Day4] 家长定制 API
  async addCustomPlan(level, chars) {
    const res = await api.post('/parent/plan/add', { target_level: level, chars });
    return res.data;
  },

  async getCustomPlans() {
    const res = await api.get('/parent/plan/list');
    return res.data;
  },

  async deleteCustomPlan(level) {
    const res = await api.delete(`/parent/plan/${level}`);
    return res.data;
  }
};




export default api;
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
【src/utils/db.js】
```js
import { get, set, del, clear } from 'idb-keyval';

const KEY_PREFIX = 'hanzi_train_';

export const db = {
  async get(key, def = null) {
    try {
      const val = await get(KEY_PREFIX + key);
      return val === undefined ? def : val;
    } catch (e) {
      console.error('DB Get Error:', e);
      return def;
    }
  },

  async set(key, value) {
    try {
      // [修复] 防止 undefined 导致 JSON.stringify 异常
      if (value === undefined) {
          console.warn(`[DB] Skipping undefined value for key: ${key}`);
          return;
      }
      // 深拷贝去除非序列化数据 (如 Proxy)
      const cleanValue = JSON.parse(JSON.stringify(value));
      await set(KEY_PREFIX + key, cleanValue);
    } catch (e) {
      console.error('DB Set Error:', e);
    }
  },

  async remove(key) {
    await del(KEY_PREFIX + key);
  },
  
  async clearAll() {
    await clear();
  }
};
```
【src/utils/effects.js】
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
【src/utils/storage.js】
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