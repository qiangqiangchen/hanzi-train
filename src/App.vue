<template>
  <OrientationCheck />
  <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component" :key="$route.fullPath" />
    </transition>
  </router-view>

  <!-- 全局成就弹窗 -->
  <AchievementToast ref="toastRef" />
  <InstallPrompt />

  <!-- ★ 全局登录弹窗 -->
  <LoginModal ref="loginModalRef" @success="onLoginSuccess" />
</template>

<script setup>
import { ref, watch, provide } from 'vue';
import { useUserStore } from './stores/user';
import OrientationCheck from './components/common/OrientationCheck.vue';
import AchievementToast from './components/common/AchievementToast.vue';
import InstallPrompt from './components/common/InstallPrompt.vue';
import LoginModal from './components/common/LoginModal.vue';

const userStore = useUserStore();
const toastRef = ref(null);
const loginModalRef = ref(null);

// ★ 通过 provide 让所有子组件都能打开登录弹窗
provide('loginModal', {
  open: (mode) => loginModalRef.value?.open(mode),
  close: () => loginModalRef.value?.close(),
});

const onLoginSuccess = () => {
  console.log('[App] Login success, data reloaded');
};

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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>