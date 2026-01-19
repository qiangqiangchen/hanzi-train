<template>
  <div class="relative w-20 h-14 flex-shrink-0">
    <!-- 烟囱 -->
    <div v-if="trainId === 'steam'" class="absolute top-0 left-4 w-4 h-6 bg-red-500 border-2 border-red-700"></div>
    <!-- [Day8] 增强烟雾 (仅蒸汽机车) -->
    <div v-if="trainId === 'steam'">
      <div class="absolute -top-4 left-4 w-3 h-3 bg-gray-300 rounded-full smoke-1"></div>
      <div class="absolute -top-6 left-6 w-2 h-2 bg-gray-200 rounded-full smoke-2"></div>
      <div class="absolute -top-5 left-2 w-2 h-2 bg-gray-300 rounded-full smoke-3"></div>
    </div>
    <!-- 车身 -->
    <div 
      class="absolute bottom-2 w-full h-10 rounded-r-xl rounded-tl-xl border-2 border-black/20 flex items-center justify-center z-10 shadow-md transition-colors duration-500"
      :class="dynamicColor"
    >
      <div class="text-xs text-white font-bold select-none">{{ trainName }}</div>
    </div>
    <!-- 车窗 -->
    <div class="absolute top-4 right-2 w-6 h-6 bg-blue-300 border-2 border-blue-400 z-20"></div>
    <!-- 轮子 -->
    <div class="absolute -bottom-1 left-2 w-4 h-4 bg-black rounded-full border-2 border-gray-500 z-30 animate-spin-slow"></div>
    <div class="absolute -bottom-1 right-2 w-5 h-5 bg-black rounded-full border-2 border-gray-500 z-30 animate-spin-slow"></div>
    <div class="absolute -left-2 top-8 w-2 h-1 bg-gray-600"  ></div>
  </div>
</template>

<style scoped>
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin 2s linear infinite; }

/* 优化后的烟雾动画 */
@keyframes smoke {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    30% { opacity: 0.8; }
    100% { transform: translateY(-30px) scale(1.5); opacity: 0; }
}

/* 我们可以生成多个烟雾泡泡 */
.smoke-1 { animation: smoke 1.5s infinite 0s; }
.smoke-2 { animation: smoke 1.5s infinite 0.5s; }
.smoke-3 { animation: smoke 1.5s infinite 1.0s; }
</style>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '../../stores/user';
import trainsData from '../../data/trains.json';

const userStore = useUserStore();

// 获取当前装备的火车信息
const currentTrain = computed(() => {
  return trainsData.find(t => t.id === userStore.currentTrainId) || trainsData[0];
});

const trainId = computed(() => currentTrain.value.id);
const trainName = computed(() => currentTrain.value.name);
// 使用配置表里的颜色类
const dynamicColor = computed(() => currentTrain.value.color); 
</script>