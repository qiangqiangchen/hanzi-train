<template>
  <div class="relative w-16 h-12 flex items-end">
    <!-- 连接钩 -->
    <div class="absolute -left-2 top-6 w-2 h-1 bg-gray-600"  ></div>
    
    <!-- 车身 -->
    <div 
      class="w-full h-10 rounded-lg flex items-center justify-center border-2 shadow-sm relative z-10"
      :class="bgClass"
    >
      <!-- 汉字 -->
      <span class="text-xl font-bold text-gray-700 font-kaiti">{{ char }}</span>
      
      <!-- 车窗装饰 -->
      <div class="absolute top-1 left-1 w-2 h-2 bg-blue-200 rounded-full opacity-50"></div>
    </div>

    <!-- 车轮 -->
    <div class="absolute -bottom-1 left-2 w-3 h-3 bg-gray-700 rounded-full border-2 border-gray-400 z-20"></div>
    <div class="absolute -bottom-1 right-2 w-3 h-3 bg-gray-700 rounded-full border-2 border-gray-400 z-20"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  char: String,
  type: {
    type: String,
    default: 'normal' // normal, golden, rainbow
  }
});

const bgClass = computed(() => {
  switch (props.type) {
    case 'golden': return 'bg-yellow-200 border-yellow-500';
    case 'rainbow': return 'bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 border-purple-500';
    default: return 'bg-blue-200 border-blue-400';
  }
});
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
</style>