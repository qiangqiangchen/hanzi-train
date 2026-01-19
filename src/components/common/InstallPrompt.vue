<template>
  <div v-if="showPrompt" class="fixed bottom-4 left-4 z-50 bg-white p-4 rounded-xl shadow-2xl border-l-4 border-blue-500 animate-slide-up flex items-center gap-4">
    <div>
      <div class="font-bold text-gray-800">安装汉字小火车</div>
      <div class="text-xs text-gray-500">添加到桌面，离线也能玩</div>
    </div>
    <div class="flex gap-2">
        <button @click="install" class="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-blue-600">安装</button>
        <button @click="showPrompt = false" class="text-gray-400 hover:text-gray-600">✕</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const showPrompt = ref(false);
let deferredPrompt = null;

onMounted(() => {
  // 监听浏览器安装事件
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPrompt.value = true;
  });
});

const install = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showPrompt.value = false;
  }
  deferredPrompt = null;
};
</script>

<style scoped>
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
</style>