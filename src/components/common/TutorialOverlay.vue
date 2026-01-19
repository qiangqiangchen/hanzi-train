<template>
  <transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[100] bg-black/70 flex flex-col items-center justify-center p-8 backdrop-blur-sm" @click="close">
      <div class="text-white text-center animate-bounce mb-8">
        <div class="text-6xl mb-4">👆</div>
        <div class="text-2xl font-bold">点击喇叭听题目</div>
      </div>
      
      <!-- 指向中间操作区的光圈 -->
      <!-- 位置大概在屏幕中间偏上，根据 Game.vue 的布局估算 -->
      <div class="w-24 h-24 border-4 border-yellow-400 rounded-full animate-ping opacity-75"></div>
      
      <div class="absolute bottom-20 text-gray-300 text-sm font-bold bg-black/30 px-4 py-2 rounded-full">
        点击任意处开始游戏
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../../stores/user';

const show = ref(false);
const userStore = useUserStore();

onMounted(() => {
  // 检查是否看过教程
  if (!userStore.settings.hasSeenTutorial) {
    // 延迟一点显示，等页面加载完
    setTimeout(() => {
        show.value = true;
    }, 1000);
  }
});

const close = () => {
  show.value = false;
  // 更新状态并保存
  userStore.updateSettings({ hasSeenTutorial: true });
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>