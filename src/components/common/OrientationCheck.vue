<template>
  <div v-if="isPortrait" class="fixed inset-0 z-[9999] bg-blue-500 flex flex-col items-center justify-center text-white text-center p-8">
    <div class="text-8xl mb-8 animate-rotate">📱</div>
    <h2 class="text-3xl font-bold mb-4">请旋转屏幕</h2>
    <p class="text-xl opacity-80">横屏玩耍体验更好哦！</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isPortrait = ref(false);

const checkOrientation = () => {
  // 简单判断：如果高 > 宽，就是竖屏
  if (window.innerHeight > window.innerWidth) {
    isPortrait.value = true;
  } else {
    isPortrait.value = false;
  }
};

onMounted(() => {
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation);
});
</script>

<style scoped>
@keyframes rotate {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-90deg); }
  50% { transform: rotate(-90deg); }
  75% { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}
.animate-rotate {
  animation: rotate 2s infinite ease-in-out;
}
</style>