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