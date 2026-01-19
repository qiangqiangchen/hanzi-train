<template>
  <div class="relative w-14 h-10 md:w-20 md:h-14 flex-shrink-0 flex items-end">
    <!-- 连接钩 -->
    <div class="absolute -left-1 md:-left-2 top-1/2 w-2 h-1 bg-gray-600"></div>
    
    <!-- 车身 -->
    <div 
      class="w-full h-8 md:h-10 rounded-lg flex items-center justify-center border-2 border-black/20 shadow-md relative z-10"
      :class="config.color"
    >
      <span class="text-lg md:text-2xl filter drop-shadow">{{ config.icon }}</span>
    </div>

    <!-- 轮子 -->
    <div class="absolute -bottom-1 left-1 w-3 h-3 md:w-4 md:h-4 bg-black rounded-full border-2 border-gray-500 z-20 animate-spin-slow"></div>
    <div class="absolute -bottom-1 right-1 w-3 h-3 md:w-4 md:h-4 bg-black rounded-full border-2 border-gray-500 z-20 animate-spin-slow"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import trainPartsData from '../../data/train_parts.json';

const props = defineProps(['partId']);

const config = computed(() => {
  return trainPartsData.find(p => p.id === props.partId) || trainPartsData[0];
});
</script>

<style scoped>
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin 2s linear infinite; }
</style>