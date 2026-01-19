<template>
  <span>{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  to: { type: Number, required: true },
  duration: { type: Number, default: 1500 }
});

const displayValue = ref(0);

const animate = () => {
  const start = 0;
  const end = props.to;
  const startTime = performance.now();

  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / props.duration, 1);
    
    // easeOutExpo 缓动函数
    const ease = 1 - Math.pow(2, -10 * progress);
    
    displayValue.value = Math.floor(start + (end - start) * ease);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      displayValue.value = end;
    }
  };
  
  requestAnimationFrame(update);
};

onMounted(animate);
watch(() => props.to, animate);
</script>