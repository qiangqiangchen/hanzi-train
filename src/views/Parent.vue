<template>
  <!-- [修复] h-screen overflow-y-auto 允许整个页面滚动 -->
  <div class="h-screen overflow-y-auto bg-gray-50 flex flex-col items-center p-4 md:p-6 font-kaiti">
    
    <!-- 锁屏界面 (保持不变) -->
    <div v-if="!isUnlocked" class="flex-1 flex flex-col items-center justify-center w-full max-w-md min-h-[500px]">
      <div class="bg-white p-8 rounded-2xl shadow-lg w-full text-center">
        <h2 class="text-2xl font-bold mb-6 text-gray-700">🔒 家长验证</h2>
        <p class="mb-4 text-gray-500">请回答：{{ num1 }} + {{ num2 }} = ?</p>
        <input 
          v-model="inputAnswer" 
          type="number" 
          class="w-full text-center text-3xl border-2 border-blue-200 rounded-lg py-3 mb-6 focus:border-blue-500 outline-none"
          placeholder="输入结果"
          @keyup.enter="checkAnswer"
        >
        <div class="flex space-x-4">
          <button @click="$router.push('/')" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">返回</button>
          <button @click="checkAnswer" class="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold shadow-md">确认</button>
        </div>
      </div>
    </div>

    <!-- 已解锁：家长控制面板 -->
    <!-- [修复] mb-10 留出底部空间 -->
    <div v-else class="w-full max-w-4xl animate-fade-in mb-10">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">👨‍👩‍👧 家长中心</h1>
        <button @click="$router.push('/')" class="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold hover:bg-gray-300 transition">
          退出
        </button>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- 左侧 -->
        <div class="space-y-6">
          <!-- 概览 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-blue-500 pl-3">学习概览</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-blue-50 p-4 rounded-xl">
                <div class="text-xs text-blue-400 mb-1">总识字量</div>
                <div class="text-3xl font-bold text-blue-600">{{ userStore.statsCount.total }}</div>
              </div>
              <div class="bg-green-50 p-4 rounded-xl">
                <div class="text-xs text-green-400 mb-1">已掌握</div>
                <div class="text-3xl font-bold text-green-600">{{ userStore.statsCount.master }}</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-xl">
                <div class="text-xs text-yellow-500 mb-1">当前关卡</div>
                <div class="text-3xl font-bold text-yellow-600">{{ userStore.progress.maxLevel }}</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-xl">
                <div class="text-xs text-purple-400 mb-1">获得星星</div>
                <div class="text-3xl font-bold text-purple-600">{{ userStore.progress.totalStars }}</div>
              </div>
            </div>
            
            <!-- 图表 -->
            <div class="mt-6 pt-6 border-t border-gray-100">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-gray-700">近7天学习趋势</h4>
              </div>
              <LearningChart :history="userStore.history" />
            </div>
          </div>

          <!-- [Day5] 云同步 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
            <h3 class="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <span>☁️</span> 云端同步
            </h3>
            
            <!-- 未登录 -->
            <div v-if="!userProfile" class="flex flex-col gap-3">
              <input v-model="form.username" type="text" placeholder="用户名" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <input v-model="form.password" type="password" placeholder="密码" class="w-full px-4 py-2 rounded-lg border bg-gray-50">
              <div class="flex gap-2">
                <button @click="handleLogin" class="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600">登录</button>
                <button @click="handleRegister" class="flex-1 bg-white text-blue-500 border border-blue-500 py-2 rounded-lg font-bold hover:bg-blue-50">注册</button>
              </div>
            </div>

            <!-- 已登录 -->
            <div v-else>
              <div class="flex justify-between items-center mb-4">
                <span class="font-bold text-gray-700">👤 {{ userProfile.username }}</span>
                <button @click="handleLogout" class="text-xs text-red-500 underline">退出</button>
              </div>
              <div class="flex gap-2 mb-4">
                <button @click="userStore.syncUpload" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg font-bold hover:bg-blue-200 text-sm flex items-center justify-center gap-1">⬆️ 上传</button>
                <button @click="userStore.syncDownload" class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold hover:bg-green-200 text-sm flex items-center justify-center gap-1">⬇️ 下载</button>
              </div>
              <div class="text-xs text-gray-400 text-center">上次同步: {{ formatTime(userProfile.last_sync) }}</div>
            </div>
          </div>

          <!-- 设置 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-orange-500 pl-3">设置</h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span class="text-gray-700 font-bold">显示拼音</span>
                <button @click="toggle('showPinyin')" class="w-12 h-6 rounded-full relative transition-colors duration-300" :class="userStore.settings.showPinyin ? 'bg-green-500' : 'bg-gray-300'">
                  <div class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm" :class="userStore.settings.showPinyin ? 'left-7' : 'left-1'"></div>
                </button>
              </div>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-700 font-bold">音效音量</span>
                  <span class="text-gray-500 text-sm">{{ Math.round(userStore.settings.sfxVolume * 100) }}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" :value="userStore.settings.sfxVolume" @input="updateVolume('sfx', $event.target.value)" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500">
              </div>
            </div>
          </div>

        </div>
        
        <!-- 右侧 -->
        <div class="space-y-6">
          
          <!-- 学习建议 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-green-500 pl-3">学习建议</h3>
            <p class="text-gray-600 text-sm leading-relaxed" v-if="userStore.statsCount.total < 10">
              孩子刚刚起步，建议每天坚持玩 10 分钟，多给予口头鼓励。
            </p>
            <p class="text-gray-600 text-sm leading-relaxed" v-else>
              掌握情况非常棒！可以尝试挑战更高难度的关卡。
            </p>
          </div>

          

          <!-- [Day1] 学习计划干预 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100">
            <h3 class="text-lg font-bold text-yellow-600 mb-4 flex items-center gap-2"><span>📅</span> 学习计划干预</h3>
            <ParentSettings />
          </div>

          <!-- 数据管理 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
            <h3 class="text-lg font-bold text-red-500 mb-4">数据管理</h3>
            <router-link to="/print" class="block w-full text-center py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition mb-4">
              🖨️ 生成描红字帖
            </router-link>
            <div class="flex gap-2 mb-4">
              <button @click="exportData" class="flex-1 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50">📤 导出</button>
              <button @click="importData" class="flex-1 py-2 border border-green-200 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50">📥 导入</button>
            </div>
            <button @click="handleReset" class="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition">
              ⚠️ 重置所有进度
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import LearningChart from '../components/parent/LearningChart.vue';
import ParentSettings from './ParentSettings.vue';
import { auth } from '../utils/api';

const userStore = useUserStore();
const isUnlocked = ref(false);
const num1 = Math.floor(Math.random() * 10);
const num2 = Math.floor(Math.random() * 10);
const inputAnswer = ref('');
const userProfile = ref(null);
const form = ref({ username: '', password: '' });

const checkAnswer = () => {
  if (parseInt(inputAnswer.value) === num1 + num2) isUnlocked.value = true;
  else { alert('答案不对哦'); inputAnswer.value = ''; }
};

const handleReset = () => {
  if (confirm('确定要重置吗？')) userStore.resetAllData();
};

const toggle = (key) => userStore.updateSettings({ [key]: !userStore.settings[key] });
const updateVolume = (t, v) => {
    userStore.updateSettings({ sfxVolume: parseFloat(v) });
    audio.playSFX('correct');
};

const exportData = () => {
  const data = userStore.serializeData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup.json`;
  a.click();
};

const importData = () => {
  const str = prompt('粘贴JSON:');
  if (str) userStore.deserializeData(str);
};

// Auth
onMounted(async () => {
  try { userProfile.value = await auth.getMe(); } catch (e) { auth.logout(); }
});
const handleLogin = async () => {
    try { await auth.login(form.value.username, form.value.password); userProfile.value = await auth.getMe(); } catch(e){ alert('Error'); }
};
const handleRegister = async () => {
    try { await auth.register(form.value.username, form.value.password); userProfile.value = await auth.getMe(); } catch(e){ alert('Error'); }
};
const handleLogout = () => { auth.logout(); userProfile.value = null; };
const formatTime = (t) => t ? new Date(t).toLocaleString() : '无';
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
</style>