<template>
  <!-- [修复] 外层 h-screen + overflow-y-auto 解决滚动问题 -->
  <!-- print:h-auto 确保打印时高度自动 -->
  <div class="h-screen overflow-y-auto bg-gray-100 p-4 md:p-8 font-kaiti print:bg-white print:p-0 print:h-auto print:overflow-visible">
    
    <!-- 顶部导航 -->
    <div class="flex justify-between items-center mb-6 max-w-[210mm] mx-auto print:hidden">
      <h1 class="text-2xl font-bold text-gray-800">🖨️ 字帖打印中心</h1>
      <div class="flex gap-2">
        <button @click="$router.push('/parent')" class="bg-gray-200 px-4 py-2 rounded font-bold hover:bg-gray-300 text-sm">返回</button>
        <button @click="print" class="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">
          <span>🖨️</span> 打印
        </button>
      </div>
    </div>

    <!-- 选项区 -->
    <div class="bg-white p-6 rounded-xl shadow-sm mb-8 max-w-[210mm] mx-auto print:hidden border border-gray-200">
      <h3 class="font-bold mb-4 text-gray-700">内容选择</h3>
      <div class="flex flex-wrap gap-6">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="recent" class="w-5 h-5 text-blue-600">
          <span>最近学习 (8字)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="hard" class="w-5 h-5 text-blue-600">
          <span>易错字 (8字)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" v-model="mode" value="all" class="w-5 h-5 text-blue-600">
          <span>所有已掌握 (20字)</span>
        </label>
      </div>
    </div>

    <!-- 字帖纸张 (A4) -->
    <!-- [修复] flex-col items-center 确保内容在纸张正中间 -->
    <div id="print-area" class="bg-white shadow-2xl mx-auto flex flex-col items-center print:shadow-none print:w-full print:block">
      
      <!-- 页眉 -->
      <div class="text-center border-b-2 border-black pb-2 mb-6 pt-4 w-full">
        <h2 class="text-3xl font-bold tracking-widest">汉字描红练习</h2>
        <div class="flex justify-between px-4 mt-2 text-sm text-gray-500 w-full">
           <span>姓名：__________</span>
           <span>日期：__________</span>
           <span>得分：__________</span>
        </div>
      </div>

      <!-- 汉字行循环 -->
      <div v-for="char in charsToPrint" :key="char" class="flex justify-center items-center mb-3 page-break-item w-full">
        
        <!-- 左侧示范字 (带拼音) -->
        <div class="flex flex-col items-center mr-4 flex-shrink-0">
          <div class="text-lg font-mono mb-0.5 font-bold text-gray-600 h-6">{{ getPinyin(char) }}</div>
          
          <div class="char-box border-2 border-red-500 relative flex items-center justify-center bg-red-50">
            <div class="grid-lines"></div>
            <span class="text-5xl font-kaiti z-10">{{ char }}</span>
          </div>
        </div>

        <!-- 右侧练习字 (8个) -->
        <!-- [修复] pt-6 对齐拼音的高度占位 -->
        <div class="flex gap-2 pt-6">
          <div v-for="n in 8" :key="n" class="char-box border border-green-600 relative flex items-center justify-center">
            <div class="grid-lines-green"></div>
            <!-- 前3个描红 -->
            <span v-if="n <= 3" class="text-5xl text-gray-300 font-kaiti z-10 opacity-50" style="-webkit-text-stroke: 1px #ccc; color: transparent;">{{ char }}</span>
          </div>
        </div>

      </div>

      <!-- 空状态 -->
      <div v-if="charsToPrint.length === 0" class="text-center text-gray-400 py-20 w-full">
        <div class="text-6xl mb-4">📭</div>
        没有符合条件的汉字
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/user';
import charsData from '../data/characters.json';

const userStore = useUserStore();
const mode = ref('recent'); 

const getPinyin = (char) => {
  const obj = charsData.find(c => c.char === char);
  return obj ? obj.pinyin : '';
};

const charsToPrint = computed(() => {
  const allChars = userStore.characters;
  const entries = Object.entries(allChars);
  
  if (entries.length === 0) return [];

  if (mode.value === 'recent') {
    return entries.sort((a, b) => b[1].lastTime - a[1].lastTime).slice(0, 8).map(e => e[0]);
  }
  if (mode.value === 'hard') {
    return entries.filter(e => e[1].wrong > 0).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 8).map(e => e[0]);
  }
  // all
  return Object.keys(allChars).filter(char => allChars[char].level >= 4).slice(0, 20);
});

const print = () => {
  window.print();
};
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }

/* A4 容器 */
#print-area {
  width: 210mm;
  padding: 15mm; /* 增加边距，让内容更聚拢 */
  box-sizing: border-box;
  min-height: 297mm;
}

/* 格子尺寸: 18mm */
/* 一行: 1示范 + 6练习 = 7个 */
/* 宽度: 7*18 + 6*2(gap) + 16(gap大) ≈ 154mm */
/* 210mm - 30mm(padding) = 180mm > 154mm，完美居中 */
.char-box {
  width: 18mm;
  height: 18mm;
  position: relative;
  box-sizing: border-box;
}

/* 辅助线 */
.grid-lines::before, .grid-lines::after {
  content: ''; position: absolute; background: #fca5a5;
}
.grid-lines::before { top: 50%; left: 0; width: 100%; height: 1px; }
.grid-lines::after { left: 50%; top: 0; height: 100%; width: 1px; }

.grid-lines-green::before, .grid-lines-green::after {
  content: ''; position: absolute; border-color: #86efac; border-style: dashed; border-width: 0;
}
.grid-lines-green::before { top: 50%; left: 0; width: 100%; border-top-width: 1px; }
.grid-lines-green::after { left: 50%; top: 0; height: 100%; border-left-width: 1px; }

@media print {
  @page { size: A4; margin: 0; }
  body { background: white; -webkit-print-color-adjust: exact; }
  .print\:hidden { display: none !important; }
  .shadow-2xl { box-shadow: none !important; }
  .page-break-item { break-inside: avoid; }
  
  #print-area {
    width: 100% !important;
    padding: 10mm !important;
    margin: 0 auto !important;
    display: block !important; /* 打印时由浏览器控制流 */
  }
}
</style>