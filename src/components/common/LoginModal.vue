<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="close">
      <div class="bg-white rounded-3xl p-8 w-full max-w-sm animate-pop-in relative shadow-2xl">
        <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>

        <div class="text-center mb-6">
          <div class="text-5xl mb-2">🚂</div>
          <h2 class="text-2xl font-bold text-gray-800">{{ isRegister ? '注册账号' : '登录账号' }}</h2>
          <p class="text-sm text-gray-400 mt-1">登录后数据自动同步到云端</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-500 font-bold mb-1 block">用户名</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-base bg-gray-50"
              @keyup.enter="handleSubmit"
            >
          </div>

          <div v-if="isRegister">
            <label class="text-sm text-gray-500 font-bold mb-1 block">昵称</label>
            <input
              v-model="form.displayName"
              type="text"
              placeholder="孩子的昵称（可选）"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-base bg-gray-50"
            >
          </div>

          <div>
            <label class="text-sm text-gray-500 font-bold mb-1 block">密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-base bg-gray-50"
              @keyup.enter="handleSubmit"
            >
          </div>

          <div v-if="errorMsg" class="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
            {{ errorMsg }}
          </div>

          <button
            @click="handleSubmit"
            :disabled="loading"
            class="w-full py-3 rounded-xl font-bold text-lg shadow-md transition active:scale-95"
            :class="loading ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            <span v-if="loading" class="animate-spin inline-block mr-2">⏳</span>
            {{ isRegister ? '注册' : '登录' }}
          </button>

          <div class="text-center">
            <button @click="toggleMode" class="text-sm text-blue-500 hover:underline">
              {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../stores/user';
import { authApi } from '../../utils/api';

const emit = defineEmits(['success', 'close']);

const visible = ref(false);
const isRegister = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const form = ref({
  username: '',
  password: '',
  displayName: '',
});

const userStore = useUserStore();

const open = (mode = 'login') => {
  isRegister.value = mode === 'register';
  visible.value = true;
  errorMsg.value = '';
  form.value = { username: '', password: '', displayName: '' };
};

const close = () => {
  visible.value = false;
  errorMsg.value = '';
};

const toggleMode = () => {
  isRegister.value = !isRegister.value;
  errorMsg.value = '';
};

const handleSubmit = async () => {
  if (!form.value.username || !form.value.password) {
    errorMsg.value = '请填写用户名和密码';
    return;
  }
  if (form.value.password.length < 4) {
    errorMsg.value = '密码至少4位';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    if (isRegister.value) {
      await authApi.register(
        form.value.username,
        form.value.password,
        form.value.displayName || userStore.info.name
      );
    } else {
      await authApi.login(form.value.username, form.value.password);
    }

    // ★ 核心：切换账号，完全重新加载数据
    await userStore.switchAccount();

    visible.value = false;
    emit('success');
  } catch (e) {
    const detail = e.response?.data?.detail;
    if (typeof detail === 'string') {
      errorMsg.value = detail;
    } else {
      errorMsg.value = isRegister.value ? '注册失败，用户名可能已被占用' : '用户名或密码错误';
    }
  } finally {
    loading.value = false;
  }
};

defineExpose({ open, close });
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes popIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
.animate-pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
</style>