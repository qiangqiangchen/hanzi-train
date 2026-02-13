<template>
  <div class="h-screen overflow-y-auto bg-gray-50 flex flex-col items-center p-4 md:p-6 font-kaiti">
    <!-- 家长验证 -->
    <div v-if="!isUnlocked" class="flex-1 flex flex-col items-center justify-center w-full max-w-md min-h-[500px]">
      <div class="bg-white p-8 rounded-2xl shadow-lg w-full text-center">
        <h2 class="text-2xl font-bold mb-6 text-gray-700">🔒 家长验证</h2>
        <p class="mb-4 text-gray-500">请回答：{{ num1 }} + {{ num2 }} = ?</p>
        <input v-model="inputAnswer" type="number"
          class="w-full text-center text-3xl border-2 border-blue-200 rounded-lg py-3 mb-6 focus:border-blue-500 outline-none"
          placeholder="输入结果" @keyup.enter="checkAnswer">
        <div class="flex space-x-4">
          <button @click="$router.push('/')"
            class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">返回</button>
          <button @click="checkAnswer"
            class="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold shadow-md">确认</button>
        </div>
      </div>
    </div>

    <!-- 主内容 -->
    <div v-else class="w-full max-w-4xl animate-fade-in mb-10">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">👨‍👩‍👧 家长中心</h1>
        <button @click="$router.push('/')"
          class="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold hover:bg-gray-300 transition">
          退出
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="dashboardLoading" class="flex items-center justify-center py-20">
        <div class="text-4xl animate-spin mr-4">⏳</div>
        <span class="text-gray-500 font-bold">加载数据中...</span>
      </div>

      <div v-else class="grid md:grid-cols-2 gap-8">
        <!-- 左列 -->
        <div class="space-y-6">
          <!-- 学习概览 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-blue-500 pl-3">学习概览</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-blue-50 p-4 rounded-xl">
                <div class="text-xs text-blue-400 mb-1">总识字量</div>
                <div class="text-3xl font-bold text-blue-600">{{ dashboard.total_chars }}</div>
              </div>
              <div class="bg-green-50 p-4 rounded-xl">
                <div class="text-xs text-green-400 mb-1">已掌握</div>
                <div class="text-3xl font-bold text-green-600">{{ dashboard.mastered_chars }}</div>
              </div>
              <div class="bg-yellow-50 p-4 rounded-xl">
                <div class="text-xs text-yellow-500 mb-1">当前关卡</div>
                <div class="text-3xl font-bold text-yellow-600">{{ dashboard.max_level }}</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-xl">
                <div class="text-xs text-purple-400 mb-1">获得星星</div>
                <div class="text-3xl font-bold text-purple-600">{{ dashboard.total_stars }}</div>
              </div>
            </div>

            <!-- 连胜 -->
            <div class="mt-4 bg-orange-50 p-4 rounded-xl flex items-center gap-3">
              <span class="text-3xl">🔥</span>
              <div>
                <div class="text-xs text-orange-400">连续打卡</div>
                <div class="text-2xl font-bold text-orange-600">{{ dashboard.daily_streak }} 天</div>
              </div>
            </div>

            <!-- 学习趋势 -->
            <div class="mt-6 pt-6 border-t border-gray-100">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-gray-700">近7天学习趋势</h4>
                <span class="text-xs text-gray-400">{{ dataSource }}</span>
              </div>
              <LearningChart :history="chartHistory" />
            </div>
          </div>

          <!-- 薄弱汉字 -->
          <div v-if="dashboard.weak_chars && dashboard.weak_chars.length > 0"
            class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-red-500 pl-3">
              ⚠️ 薄弱汉字 <span class="text-sm text-gray-400 font-normal">（错误率较高）</span>
            </h3>
            <div class="flex flex-wrap gap-2">
              <div v-for="item in dashboard.weak_chars" :key="item.char"
                class="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-red-100 transition"
                @click="addToPriority(item.char)">
                <span class="text-2xl font-bold text-red-700">{{ item.char }}</span>
                <div class="text-xs text-red-500">
                  <div>✓{{ item.correct }} ✗{{ item.wrong }}</div>
                  <div>Lv.{{ item.level }}</div>
                </div>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-3">💡 点击汉字可加入优先学习列表</p>
          </div>

          <!-- 学习建议 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm">
            <h3 class="text-lg font-bold text-gray-600 mb-4 border-l-4 border-green-500 pl-3">学习建议</h3>
            <p class="text-gray-600 text-sm leading-relaxed" v-if="dashboard.total_chars < 10">
              孩子刚刚起步，建议每天坚持玩 10 分钟，多给予口头鼓励。
            </p>
            <p class="text-gray-600 text-sm leading-relaxed"
              v-else-if="dashboard.mastered_chars < dashboard.total_chars * 0.5">
              孩子认识了不少字，但掌握率还可以提高。建议多做复习关卡，巩固已学汉字。
            </p>
            <p class="text-gray-600 text-sm leading-relaxed" v-else>
              掌握情况非常棒！可以尝试挑战更高难度的关卡。
            </p>
          </div>

          <!-- 云端同步 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
            <h3 class="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <span>☁️</span> 云端同步
            </h3>
            <div v-if="!userProfile" class="flex flex-col items-center gap-4 py-4">
              <p class="text-gray-500 text-sm text-center">登录后可同步数据到云端，换设备也不丢失进度</p>
              <div class="flex gap-3 w-full">
                <button @click="handleLogin"
                  class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition">
                  登录
                </button>
                <button @click="handleRegister"
                  class="flex-1 bg-white text-blue-500 border-2 border-blue-500 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                  注册
                </button>
              </div>
            </div>
            <div v-else>
              <div class="flex justify-between items-center mb-4">
                <span class="font-bold text-gray-700">👤 {{ userProfile.username }}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded-full font-bold"
                    :class="userStore.isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'">
                    {{ userStore.isOnline ? '🟢 在线' : '⚪ 离线' }}
                  </span>
                  <button @click="handleLogout" class="text-xs text-red-500 underline">退出</button>
                </div>
              </div>
              <div class="flex gap-2 mb-4">
                <button @click="userStore.syncUpload()"
                  class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg font-bold hover:bg-blue-200 text-sm flex items-center justify-center gap-1">⬆️
                  上传存档</button>
                <button @click="userStore.syncDownload()"
                  class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold hover:bg-green-200 text-sm flex items-center justify-center gap-1">⬇️
                  下载存档</button>
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
                <button @click="toggleSetting('showPinyin')"
                  class="w-12 h-6 rounded-full relative transition-colors duration-300"
                  :class="userStore.settings.showPinyin ? 'bg-green-500' : 'bg-gray-300'">
                  <div class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm"
                    :class="userStore.settings.showPinyin ? 'left-7' : 'left-1'"></div>
                </button>
              </div>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-700 font-bold">背景音乐</span>
                  <span class="text-gray-500 text-sm">{{ Math.round(userStore.settings.bgmVolume * 100) }}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" :value="userStore.settings.bgmVolume"
                  @input="updateVolume('bgm', $event.target.value)"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500">
              </div>
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-700 font-bold">音效音量</span>
                  <span class="text-gray-500 text-sm">{{ Math.round(userStore.settings.sfxVolume * 100) }}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" :value="userStore.settings.sfxVolume"
                  @input="updateVolume('sfx', $event.target.value)"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500">
              </div>
            </div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="space-y-6">
          <!-- 学习计划干预 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100">
            <h3 class="text-lg font-bold text-yellow-600 mb-4 flex items-center gap-2"><span>📅</span> 学习计划干预</h3>

            <!-- 优先学习列表 -->
            <div class="mb-6">
              <h4 class="font-bold text-gray-600 mb-2 text-sm">优先学习的字</h4>
              <div class="flex flex-wrap gap-2 mb-3">
                <span v-for="char in userStore.priorityList" :key="char"
                  class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  {{ char }}
                  <button @click="removePriority(char)" class="text-yellow-500 hover:text-red-500 ml-1">✕</button>
                </span>
                <span v-if="userStore.priorityList.length === 0" class="text-gray-400 text-sm">暂无</span>
              </div>
              <div class="flex gap-2">
                <input v-model="newPriorityChar" type="text" maxlength="1" placeholder="输入一个汉字"
                  class="flex-1 px-3 py-2 border rounded-lg text-center text-lg">
                <button @click="addPriority"
                  class="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600">添加</button>
              </div>
            </div>

            <!-- 跳过列表 -->
            <div>
              <h4 class="font-bold text-gray-600 mb-2 text-sm">跳过的字 <span
                  class="font-normal text-gray-400">（太简单不再出现）</span></h4>
              <div class="flex flex-wrap gap-2 mb-3">
                <span v-for="char in userStore.skippedChars" :key="char"
                  class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  {{ char }}
                  <button @click="removeSkip(char)" class="text-gray-400 hover:text-red-500 ml-1">✕</button>
                </span>
                <span v-if="!userStore.skippedChars || userStore.skippedChars.length === 0"
                  class="text-gray-400 text-sm">暂无</span>
              </div>
              <div class="flex gap-2">
                <input v-model="newSkipChar" type="text" maxlength="1" placeholder="输入一个汉字"
                  class="flex-1 px-3 py-2 border rounded-lg text-center text-lg">
                <button @click="addSkip"
                  class="bg-gray-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-600">跳过</button>
              </div>
            </div>
                      <!-- 自定义生字 -->
            <div class="mt-6 pt-6 border-t border-gray-100">
              <h4 class="font-bold text-gray-600 mb-2 text-sm">➕ 添加自定义生字</h4>
              <p class="text-xs text-gray-400 mb-3">添加课本上的字，系统会自动生成拼音和语音</p>
              <div class="flex gap-2 mb-2">
                <input v-model="customChar.char" type="text" maxlength="1" placeholder="汉字" class="w-16 px-3 py-2 border rounded-lg text-center text-lg">
                <input v-model="customChar.example" type="text" placeholder="组词（如：学校）" class="flex-1 px-3 py-2 border rounded-lg text-sm">
              </div>
              <div class="flex gap-2">
                <input v-model="customChar.distractors" type="text" placeholder="易混字，逗号分隔（如：入,八）" class="flex-1 px-3 py-2 border rounded-lg text-sm">
                <button
                  @click="addCustomCharHandler"
                  :disabled="customCharLoading || !customChar.char"
                  class="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                >
                  <span v-if="customCharLoading" class="animate-spin">⏳</span>
                  {{ customCharLoading ? '生成中' : '添加' }}
                </button>
              </div>
              <div v-if="customCharMsg" class="mt-2 text-sm" :class="customCharError ? 'text-red-500' : 'text-green-600'">
                {{ customCharMsg }}
              </div>

              <!-- 已添加的自定义字 -->
              <div v-if="Object.keys(userStore.customCharacters).length > 0" class="mt-4">
                <h5 class="text-xs text-gray-500 mb-2">已添加的自定义字：</h5>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(data, char) in userStore.customCharacters"
                    :key="char"
                    class="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-sm font-bold"
                  >
                    {{ char }}
                    <span class="text-xs text-green-500 ml-1">({{ data.pinyin }})</span>
                  </span>
                </div>
              </div>
            </div>  
          </div>

          <!-- 数据管理 -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
            <h3 class="text-lg font-bold text-red-500 mb-4">数据管理</h3>
            <router-link to="/print"
              class="block w-full text-center py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition mb-4">
              🖨️ 生成描红字帖
            </router-link>
            <div class="flex gap-2 mb-4">
              <button @click="exportData"
                class="flex-1 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50">📤
                导出</button>
              <button @click="importData"
                class="flex-1 py-2 border border-green-200 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50">📥
                导入</button>
            </div>
            <button @click="handleReset"
              class="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition">
              ⚠️ 重置所有进度
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import { useUserStore } from '../stores/user';
import { authApi, parentApi, progressApi, ttsApi } from '../utils/api';
import LearningChart from '../components/parent/LearningChart.vue';




const userStore = useUserStore();
// 获取全局登录弹窗
const loginModal = inject('loginModal');

// ==================== 家长验证 ====================
const isUnlocked = ref(false);
const num1 = ref(Math.floor(Math.random() * 50) + 10);
const num2 = ref(Math.floor(Math.random() * 50) + 10);
const inputAnswer = ref('');

const checkAnswer = async () => {
  if (Number(inputAnswer.value) === num1.value + num2.value) {
    isUnlocked.value = true;
    // 先确保登录状态已检查完毕
    await checkLoginStatus();
    await loadDashboard();
  } else {
    alert('答案不对哦~');
    num1.value = Math.floor(Math.random() * 50) + 10;
    num2.value = Math.floor(Math.random() * 50) + 10;
    inputAnswer.value = '';
  }
};

// ==================== Dashboard 数据 ====================
const dashboardLoading = ref(false);
const dashboard = ref({
  total_chars: 0,
  mastered_chars: 0,
  learning_chars: 0,
  max_level: 1,
  total_stars: 0,
  daily_streak: 0,
  recent_history: [],
  weak_chars: [],
});
const dataSource = ref('');

const chartHistory = computed(() => {
  // 优先后端补全的历史
  if (dashboard.value.chart_history && dashboard.value.chart_history.length > 0) {
    return dashboard.value.chart_history;
  }
  // 其次后端 dashboard 里的 recent_history
  if (dashboard.value.recent_history && dashboard.value.recent_history.length > 0) {
    return dashboard.value.recent_history.map(h => ({
      date: h.date.slice(5),
      count: h.chars_count,
    }));
  }
  // 兜底本地
  return userStore.history;
});

const loadDashboard = async () => {
  if (userStore.isOnline && authApi.isLoggedIn()) {
    dashboardLoading.value = true;
    try {
      const [dashData, historyData] = await Promise.all([
        parentApi.getDashboard(),
        parentApi.getHistory(7).catch(() => null),
      ]);

      dashboard.value = dashData;

      // 如果历史接口返回了补全的数据，优先使用
      if (historyData && historyData.length > 0) {
        dashboard.value.chart_history = historyData;
      }

      dataSource.value = '☁️ 云端数据';
      dashboardLoading.value = false;
      return;
    } catch (e) {
      console.warn('[Parent] Server dashboard failed:', e.message);
    }
    dashboardLoading.value = false;
  }

  const stats = userStore.statsCount;
  dashboard.value = {
    total_chars: stats.total,
    mastered_chars: stats.master,
    learning_chars: stats.learning,
    max_level: userStore.progress.maxLevel,
    total_stars: userStore.progress.totalStars,
    daily_streak: userStore.dailyStreak || 0,
    recent_history: [],
    weak_chars: [],
    chart_history: null,
  };
  dataSource.value = '📱 本地数据';
};

// ==================== 登录/注册 ====================
const userProfile = ref(null);

const checkLoginStatus = async () => {
  if (authApi.isLoggedIn()) {
    try {
      const me = await authApi.getMe();
      userProfile.value = me;
      userStore.isOnline = true;
    } catch (e) {
      console.warn('[Parent] Login check failed:', e.message);
      userProfile.value = null;
      userStore.isOnline = false;
    }
  } else {
    userProfile.value = null;
    userStore.isOnline = false;
  }
};

const handleRegister = () => {
  loginModal.open('register');
};

const handleLogin = () => {
  loginModal.open('login');
};

const handleLogout = async () => {
  if (!confirm('确定要退出登录吗？')) return;
  authApi.logout();
  userProfile.value = null;

  // ★ 切换账号：清空 store，重新从本地加载
  await userStore.switchAccount();

  loadDashboard();
};

// ==================== 设置 (A2) ====================
const toggleSetting = (key) => {
  userStore.updateSettings({ [key]: !userStore.settings[key] });
};

const updateVolume = (type, value) => {
  const vol = parseFloat(value);
  if (type === 'bgm') {
    userStore.updateSettings({ bgmVolume: vol });
  } else {
    userStore.updateSettings({ sfxVolume: vol });
  }
};

// ==================== 优先字/跳过字 ====================
const newPriorityChar = ref('');
const newSkipChar = ref('');

const addPriority = () => {
  const char = newPriorityChar.value.trim();
  if (!char) return;
  userStore.addPriorityChar(char);
  newPriorityChar.value = '';
};

const removePriority = (char) => {
  userStore.removePriorityChar(char);
};

const addToPriority = (char) => {
  userStore.addPriorityChar(char);
  alert(`"${char}" 已加入优先学习列表！`);
};

const addSkip = () => {
  const char = newSkipChar.value.trim();
  if (!char) return;
  userStore.addSkipChar(char);
  newSkipChar.value = '';
};

const removeSkip = (char) => {
  userStore.removeSkipChar(char);
};

// ==================== 数据管理 ====================
const exportData = () => {
  const json = userStore.serializeData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hanzi_train_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    await userStore.deserializeData(text);
  };
  input.click();
};

const handleReset = () => {
  if (confirm('⚠️ 确定要重置所有进度吗？此操作不可恢复！')) {
    if (confirm('再次确认：真的要清除所有数据吗？')) {
      userStore.resetAllData();
    }
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '从未同步';
  try {
    const d = new Date(timeStr);
    return d.toLocaleString('zh-CN');
  } catch {
    return timeStr;
  }
};

// ==================== 生命周期 ====================
onMounted(async () => {
  await checkLoginStatus();
});

// 监听 isOnline 变化 + isLoaded 变化，登录/切换账号后刷新
watch(
  () => [userStore.isOnline, userStore.isLoaded],
  async ([online, loaded]) => {
    if (loaded && isUnlocked.value) {
      await checkLoginStatus();
      await loadDashboard();
    }
  }
);

// ==================== 自定义字 ====================
const customChar = ref({ char: '', example: '', distractors: '' });
const customCharLoading = ref(false);
const customCharMsg = ref('');
const customCharError = ref(false);

const addCustomCharHandler = async () => {
  const char = customChar.value.char.trim();
  if (!char) return;

  customCharLoading.value = true;
  customCharMsg.value = '';
  customCharError.value = false;

  try {
    const distractors = customChar.value.distractors
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);

    const result = await ttsApi.createChar(char, customChar.value.example, distractors);

    // 保存到 store
    userStore.addCustomChar(result);

    // 也加入优先列表
    userStore.addPriorityChar(char);

    customCharMsg.value = `✅ "${char}" 添加成功！拼音: ${result.pinyin}`;
    customChar.value = { char: '', example: '', distractors: '' };
  } catch (e) {
    customCharError.value = true;
    customCharMsg.value = '❌ 添加失败: ' + (e.response?.data?.detail || e.message);
  } finally {
    customCharLoading.value = false;
  }
};

</script>

<style scoped>
.font-kaiti {
  font-family: "KaiTi", "STKaiti", serif;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
</style>