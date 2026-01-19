<template>
  <OrientationCheck />
  <!-- [Day9] 页面转场 -->
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
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