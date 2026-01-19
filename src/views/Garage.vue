<template>
  <div class="h-screen bg-gray-100 flex flex-col font-kaiti overflow-hidden">
    
    <!-- 顶部导航 -->
    <div class="flex-shrink-0 flex flex-col md:flex-row justify-between items-center p-4 md:p-6 bg-gray-100 z-10 gap-3">
      <div class="flex flex-wrap justify-center gap-2">
        <button 
          v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          class="px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold transition-all text-xs md:text-base whitespace-nowrap"
          :class="activeTab === tab.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-500'"
        >
          {{ tab.name }}
        </button>
      </div>
      <router-link to="/" class="bg-gray-200 text-gray-700 px-6 py-1.5 md:py-2 rounded-full font-bold text-sm md:text-base">
        返回
      </router-link>
    </div>

    <!-- 内容主区域 -->
    <div class="flex-1 w-full max-w-5xl mx-auto overflow-hidden px-4 pb-4 md:px-6">
      
      <!-- Tab 1: 汉字本 (虚拟滚动逻辑) -->
      <div v-if="activeTab === 'chars'" class="h-full flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
         <div class="p-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
           <div class="relative">
             <input v-model="searchQuery" type="text" placeholder="🔍 输入汉字搜索..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blue-400 outline-none text-base bg-gray-50">
             <div v-if="searchQuery" @click="searchQuery=''" class="absolute right-4 top-3.5 text-gray-400 cursor-pointer">✕</div>
           </div>
         </div>
         <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
             <div v-if="flatChars.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
                <div class="text-6xl mb-4">📭</div>
                <div>{{ searchQuery ? '没有找到这个字' : '还没有收集到汉字' }}</div>
             </div>
             <div v-else class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 pb-20">
                <div 
                  v-for="charData in flatChars" 
                  :key="charData.char"
                  class="aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition active:scale-95 bg-white cursor-pointer shadow-sm hover:shadow-md relative"
                  :class="getStatusColor(charData.status)"
                  @click="openDetail(charData.char)"
                >
                  <span class="text-2xl md:text-4xl font-bold text-gray-800">{{ charData.char }}</span>
                  <div class="w-2/3 h-1.5 bg-gray-100 mt-2 rounded-full overflow-hidden">
                    <div class="h-full bg-current opacity-60" :style="{ width: Math.min(100, (charData.streak / 5) * 100) + '%' }"></div>
                  </div>
                </div>
             </div>
         </div>
      </div>

      <!-- Tab 2: 火车库 & 配件 -->
      <div v-if="activeTab === 'trains'" class="h-full overflow-y-auto animate-fade-in custom-scrollbar">
        <!-- 车头列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
            <div v-for="train in trainsList" :key="train.id" class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border-2 md:border-4" :class="[isUnlocked(train.id) ? 'border-white' : 'border-gray-100 opacity-80', userStore.currentTrainId === train.id ? 'ring-2 md:ring-4 ring-green-400 border-green-100' : '']">
              <div class="flex items-center space-x-4">
                <div class="w-20 h-20 md:w-32 md:h-24 rounded-xl flex items-center justify-center shadow-inner relative flex-shrink-0 bg-gray-100" :class="isUnlocked(train.id) ? train.color : 'bg-gray-300'">
                  <span class="text-3xl md:text-4xl">🚂</span>
                  <div v-if="!isUnlocked(train.id)" class="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl text-xl">🔒</div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-start"><h3 class="text-lg md:text-2xl font-bold text-gray-800 truncate">{{ train.name }}</h3><span v-if="userStore.currentTrainId === train.id" class="bg-green-100 text-green-700 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold">已装备</span></div>
                  <p class="text-gray-500 text-xs mt-1 mb-2 line-clamp-2">{{ train.desc }}</p>
                  <div class="flex justify-between items-center mt-2"><span class="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] md:text-xs font-bold">技能: {{ train.skill }}</span><button v-if="userStore.currentTrainId !== train.id && isUnlocked(train.id)" @click="equip(train.id)" class="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">装备</button><span v-else-if="!isUnlocked(train.id)" class="text-orange-500 text-xs font-bold">需{{ train.unlockValue }}星</span></div>
                </div>
              </div>
            </div>
        </div>

        <!-- [修复] 补回组装工厂 -->
        <div class="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-300 mb-20">
          <h3 class="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><span>🔧</span> 组装车厢</h3>
          
          <!-- 预览区 -->
          <div class="flex items-end gap-1 mb-6 p-4 bg-gray-200/50 rounded-xl overflow-x-auto min-h-[80px]">
             <!-- 注意：车头在最左，配件在后，这里不需要 reverse -->
             <TrainHead class="transform scale-75 origin-bottom flex-shrink-0" />
             <TrainPart v-for="pid in userStore.equippedParts" :key="pid" :partId="pid" class="transform scale-75 origin-bottom" />
             <div v-if="userStore.equippedParts.length === 0" class="text-gray-400 text-sm self-center ml-4">点击下方配件挂载</div>
          </div>

          <!-- 配件列表 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              v-for="part in allParts" 
              :key="part.id"
              class="bg-white p-3 md:p-4 rounded-xl border-2 flex flex-col items-center relative cursor-pointer transition hover:shadow-md hover:border-blue-300"
              :class="isPartUnlocked(part.id) ? (isPartEquipped(part.id) ? 'border-green-500 bg-green-50' : 'border-gray-200') : 'opacity-60 border-dashed'"
              @click="togglePart(part.id)"
            >
              <div class="text-3xl md:text-4xl mb-2">{{ part.icon }}</div>
              <div class="font-bold text-gray-800 text-sm">{{ part.name }}</div>
              
              <!-- 状态 -->
              <div v-if="isPartEquipped(part.id)" class="absolute top-2 right-2 text-green-500 text-lg">✔</div>
              <div v-if="!isPartUnlocked(part.id)" class="absolute inset-0 bg-gray-100/80 flex items-center justify-center font-bold text-gray-500 text-xs rounded-xl backdrop-blur-[1px]">
                🔒 需{{ part.unlockValue }}字
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 成就馆 -->
      <div v-if="activeTab === 'achievements'" class="h-full overflow-y-auto animate-fade-in custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 p-4 md:p-6">
          <div v-for="ach in allAchievements" :key="ach.id" class="bg-white rounded-xl p-4 shadow-sm border flex items-center" :class="isAchieved(ach.id) ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 opacity-60 grayscale'">
            <div class="w-12 h-12 mr-3 flex-shrink-0 relative flex items-center justify-center bg-gray-50 rounded-full border overflow-hidden text-2xl">
              <span v-if="!isAchieved(ach.id)">🔒</span>
              <img v-else :src="`/images/achievements/${ach.icon}`" class="w-full h-full object-cover" @error="(e)=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex'}" />
              <span class="absolute inset-0 items-center justify-center bg-yellow-100 hidden">🏆</span>
            </div>
            <div><div class="font-bold text-gray-800 text-sm md:text-base">{{ ach.name }}</div><div class="text-xs text-gray-500">{{ ach.desc }}</div></div>
          </div>
        </div>
      </div>

    </div>

    <!-- 弹窗 -->
    <div v-if="selectedChar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="selectedChar = null">
      <div class="bg-white rounded-3xl p-6 w-full max-w-sm animate-pop-in relative">
        <button @click="selectedChar = null" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        <div class="text-center mb-6">
          <div class="text-4xl font-bold text-gray-800 mb-2">{{ selectedChar }}</div>
          <div v-if="userStore.settings.showPinyin" class="text-xl text-gray-500 font-mono">{{ getPinyin(selectedChar) }}</div>
        </div>
        <div class="flex justify-center">
          <HanziWriter :char="selectedChar" :size="260" />
        </div>
        <div class="mt-6 text-center">
          <div class="text-sm text-gray-400">掌握程度</div>
          <div class="flex justify-center gap-1 mt-2">
            <div v-for="i in 5" :key="i" class="w-8 h-2 rounded-full" :class="i <= getLevel(selectedChar) ? 'bg-green-500' : 'bg-gray-200'"></div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../stores/user';
import { audio } from '../utils/audio';
import trainsData from '../data/trains.json';
import achievementsData from '../data/achievements.json';
import charsData from '../data/characters.json'; 
import trainPartsData from '../data/train_parts.json'; // 引入配件数据
import HanziWriter from '../components/common/HanziWriter.vue';
import TrainHead from '../components/game/TrainHead.vue';
import TrainPart from '../components/game/TrainPart.vue'; // 引入配件组件

const userStore = useUserStore();
const activeTab = ref('chars'); 
const trainsList = ref(trainsData);
const allAchievements = ref(achievementsData);
const allParts = ref(trainPartsData);
const searchQuery = ref('');
const selectedChar = ref(null);

const tabs = [
    { id: 'chars', name: '📖 汉字本' },
    { id: 'trains', name: '🚂 火车库' },
    { id: 'achievements', name: '🏆 成就馆' }
];

const flatChars = computed(() => {
  const all = userStore.characters;
  const query = searchQuery.value.trim();
  const arr = [];
  Object.keys(all).forEach(key => {
    if (!query || key.includes(query)) {
      arr.push({ ...all[key], char: key });
    }
  });
  return arr;
});

onMounted(() => {
  const newUnlockId = userStore.checkUnlockTrains();
  if (newUnlockId) audio.playSFX('correct'); 
  userStore.checkAchievements();
  userStore.checkUnlockParts();
});

const isUnlocked = (id) => userStore.trains.includes(id);
const isAchieved = (id) => userStore.achievements.includes(id);
const equip = (id) => { userStore.equipTrain(id); audio.playSFX('correct'); };

// 配件逻辑
const isPartUnlocked = (id) => userStore.unlockedParts.includes(id);
const isPartEquipped = (id) => userStore.equippedParts.includes(id);

const togglePart = (id) => {
  if (!isPartUnlocked(id)) return;
  const current = [...userStore.equippedParts];
  const index = current.indexOf(id);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    if (current.length >= 3) {
      alert('车厢太重啦，最多挂 3 个配件！'); 
      return;
    }
    current.push(id);
  }
  userStore.equipParts(current);
  audio.playSFX('attach'); 
};

const openDetail = (char) => {
  audio.playChar(char);
  selectedChar.value = char;
};

const getPinyin = (char) => {
  const charObj = charsData.find(c => c.char === char);
  return charObj ? charObj.pinyin : ''; 
};

const getLevel = (char) => userStore.characters[char]?.level || 0;

const getStatusColor = (status) => {
  if (status === 'mastered') return 'border-green-200 text-green-700 bg-green-50';
  if (status === 'familiar') return 'border-blue-200 text-blue-700 bg-blue-50';
  return 'border-orange-200 text-orange-700 bg-orange-50';
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes pop-in { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
.animate-pop-in { animation: pop-in 0.3s ease-out forwards; }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 3px; }
</style>