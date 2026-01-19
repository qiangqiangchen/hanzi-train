<template>
  <div class="relative flex flex-col items-center">
    <!-- 汉字容器 -->
    <!-- bg-grid 是田字格背景，我们在 CSS 里定义 -->
    <div ref="charContainer" class="w-full aspect-square bg-white rounded-xl shadow-inner border-2 border-gray-200 relative hanzi-grid"></div>
    
    <!-- 控制栏 -->
    <div class="mt-4 flex gap-4">
      <button 
        @click="animate" 
        class="bg-blue-500 text-white px-4 py-2 rounded-full shadow hover:bg-blue-600 active:scale-95 transition flex items-center gap-2"
        :disabled="loading"
      >
        <span>▶️</span> 笔顺
      </button>
      
      <button 
        @click="quiz" 
        class="bg-green-500 text-white px-4 py-2 rounded-full shadow hover:bg-green-600 active:scale-95 transition flex items-center gap-2"
        :disabled="loading"
      >
        <span>✏️</span> 描红
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import HanziWriter from 'hanzi-writer';

const props = defineProps({
  char: { type: String, required: true },
  size: { type: Number, default: 200 }
});

const charContainer = ref(null);
let writer = null;
const loading = ref(true);

const initWriter = () => {
  if (!charContainer.value) return;
  
  // 清空旧内容
  charContainer.value.innerHTML = '';
  loading.value = true;

  writer = HanziWriter.create(charContainer.value, props.char, {
    width: props.size,
    height: props.size,
    padding: 10,
    showOutline: true,
    strokeAnimationSpeed: 1, // 动画速度
    delayBetweenStrokes: 200, // 笔画间隔
    strokeColor: '#333333',
    radicalColor: '#168F16', // 部首颜色
    // 关键：数据源加载函数
    // hanzi-writer 默认去 CDN 拉取数据，如果慢可以下载到本地 public/data/
    // 这里我们先用默认 CDN
    onLoadCharDataSuccess: () => {
      loading.value = false;
    },
    onLoadCharDataError: (err) => {
      console.warn('Hanzi load failed', err);
      loading.value = false;
    }
  });
};

const animate = () => {
  if (writer) writer.animateCharacter();
};

const quiz = () => {
  if (writer) writer.quiz();
};

onMounted(() => {
  initWriter();
});

// 监听字符变化，重新初始化
watch(() => props.char, () => {
  initWriter();
});
</script>

<style scoped>
/* 田字格背景 CSS */
.hanzi-grid {
  background-image: 
    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
  background-size: 50% 50%; /* 分成4格 */
  background-position: center;
}
/* 这里其实可以用 SVG 做更标准的米字格，这是简易版 */
.hanzi-grid::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border: 1px dashed #e5e7eb;
  transform: rotate(45deg) scale(0.7); /* 简易斜线，效果一般，可以不加 */
  pointer-events: none;
}
</style>