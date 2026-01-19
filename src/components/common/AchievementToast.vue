<template>
  <div
    class="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none"
  >
    <transition-group name="toast">
      <div
        v-for="item in queue"
        :key="item.id"
        class="mb-4 bg-white rounded-2xl shadow-2xl border-4 border-yellow-400 p-4 flex items-center min-w-[300px] pointer-events-auto animate-bounce-in"
      >
        <!-- 徽章图标 -->
        <div
          class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0 border-2 border-yellow-200 overflow-hidden"
        >
          <!-- 优先显示图片，加载失败则显示 emoji 兜底 -->
          <img
            :src="`/images/achievements/${item.icon}`"
            class="w-full h-full object-cover"
            alt="badge"
            @error="
              $event.target.style.display = 'none';
              $event.target.nextElementSibling.style.display = 'block';
            "
          />
          <span class="text-3xl hidden">🏆</span>
        </div>

        <!-- 文本 -->
        <div>
          <div class="text-xs text-yellow-600 font-bold uppercase tracking-wider">
            解锁新成就
          </div>
          <div class="text-xl font-bold text-gray-800">{{ item.name }}</div>
          <div class="text-xs text-gray-500">{{ item.desc }}</div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, defineExpose } from "vue";
import { audio } from "../../utils/audio";

const queue = ref([]);

// 暴露给父组件调用
const show = (achievement) => {
  // 播放音效 (如果没有专门的 achievement.mp3，就用 win.mp3)
  audio.playSFX("achievement");

  queue.value.push(achievement);

  // 3秒后自动消失
  setTimeout(() => {
    // 移除队列中的第一个（这里简化处理，假设顺序移除）
    const index = queue.value.findIndex((i) => i.id === achievement.id);
    if (index > -1) queue.value.splice(index, 1);
  }, 4000);
};

defineExpose({ show });
</script>

<style scoped>
/* 弹窗动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-50px) scale(0.5);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@keyframes bounceIn {
  0% {
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
.animate-bounce-in {
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
