<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-[100] flex flex-col justify-end pb-10 px-4 font-kaiti" :class="currentScript.background || 'bg-black/80'">
      <div v-if="!currentScript.background" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <!-- 立绘 -->
      <div class="relative z-10 mx-auto mb-4 animate-bounce-slow">
        <div class="text-9xl filter drop-shadow-xl select-none">
            {{ getAvatar(currentDialog.role, currentDialog.emotion) }}
        </div>
      </div>

      <!-- 对话框 -->
      <div 
        class="relative z-10 bg-white rounded-3xl p-6 shadow-2xl border-4 border-blue-200 cursor-pointer animate-pop-in select-none active:scale-95 transition"
        @click="next"
      >
        <div class="absolute -top-5 left-6 bg-blue-500 text-white px-4 py-1 rounded-full font-bold shadow-md">
          {{ currentDialog.name }}
        </div>

        <div class="text-xl md:text-2xl text-gray-800 leading-relaxed min-h-[3rem]">
          {{ displayedText }}<span class="animate-pulse ml-1 text-blue-500">|</span>
        </div>

        <div class="absolute bottom-4 right-6 text-gray-400 text-sm animate-pulse">
          点击继续 ▶
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import { audio } from '../../utils/audio';
import { Howl } from 'howler';

const props = defineProps({
  script: Object
});

const emit = defineEmits(['finish']);

const visible = ref(false);
const currentIndex = ref(0);
const displayedText = ref('');
const timer = ref(null);

const currentScript = computed(() => props.script || {});
const currentDialog = computed(() => currentScript.value.dialogs?.[currentIndex.value] || {});

const playStoryAudio = (levelId, index) => {
    // 停止之前的 TTS 或 MP3
    window.speechSynthesis.cancel();
    if (currentAudio.value) currentAudio.value.stop();

    const url = `/audio/story/story_${levelId}_${index}.mp3`;
    const sound = new Howl({
        src: [url],
        volume: 1.0,
        html5: true,
        onloaderror: () => {
            // 降级 TTS
            audio.speakTTS(currentDialog.value.text);
        }
    });
    sound.play();
    currentAudio.value = sound;
};
const currentAudio = ref(null);


// 打字机 & 语音
const typeWriter = () => {
  const text = currentDialog.value.text;
  if (!text) return;
  
  // [Day5 优化] 播放剧情语音
  // 停止之前的语音
  window.speechSynthesis.cancel();
  if (currentAudio.value) currentAudio.value.stop();

  // [修复] 优先使用后端返回的 audio_url
  if (currentDialog.value.audio_url) {
      const sound = new Howl({
          src: [currentDialog.value.audio_url],
          html5: true,
          onloaderror: () => audio.speakTTS(text)
      });
      sound.play();
      currentAudio.value = sound;
  } 
  // 其次尝试本地静态资源 (手动配置的剧情)
  else if (currentScript.value.id && !currentScript.value.id.startsWith('ai_')) {
      playStoryAudio(currentScript.value.id, currentIndex.value);
  } 
  // 最后兜底 TTS
  else {
      audio.speakTTS(text);
  }
  
  displayedText.value = '';
  let i = 0;
  
  if (timer.value) clearInterval(timer.value);
  
  timer.value = setInterval(() => {
    if (i < text.length) {
      displayedText.value += text.charAt(i);
      i++;
    } else {
      clearInterval(timer.value);
    }
  }, 50); // 打字速度 50ms
};

const next = () => {
  // 快速显示
  if (displayedText.value.length < currentDialog.value.text.length) {
    if (timer.value) clearInterval(timer.value);
    displayedText.value = currentDialog.value.text;
    return;
  }

  // 下一句
  if (currentIndex.value < currentScript.value.dialogs.length - 1) {
    currentIndex.value++;
    typeWriter();
    audio.playSFX('correct'); // 点击音效
  } else {
    // 结束
    visible.value = false;
    window.speechSynthesis.cancel(); // 停止语音
    emit('finish');
  }
};

const getAvatar = (role, emotion) => {
  if (role === 'conductor') {
    if (emotion === 'shock') return '🙀';
    if (emotion === 'worry') return '😿';
    if (emotion === 'happy') return '🎅';
    return '👮‍♂️';
  }
  return '🤖';
};

const start = () => {
  visible.value = true;
  currentIndex.value = 0;
  // 稍微延迟，等待动画开始后再说话
  setTimeout(() => {
      typeWriter();
  }, 300);
};

defineExpose({ start });
</script>

<style scoped>
.font-kaiti { font-family: "KaiTi", "STKaiti", serif; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.animate-pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes popIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
.animate-bounce-slow { animation: bounce 3s infinite; }
</style>