<template>
  <div class="fixed top-20 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
    
    <!-- 连胜徽章 -->
    <div class="bg-white/90 backdrop-blur rounded-l-full rounded-r-lg shadow-lg p-2 border-2 border-orange-200 flex items-center gap-2 transform transition-all duration-500"
         :class="isTodayCheckedIn ? 'scale-100 opacity-100' : 'scale-95 opacity-80 grayscale'">
      <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-2xl border border-orange-300">
        🔥
      </div>
      <div class="pr-2">
        <div class="text-xs text-gray-500 font-bold uppercase">连续打卡</div>
        <div class="text-xl font-bold text-orange-600 leading-none">{{ streak }} 天</div>
      </div>
    </div>

    <!-- 本周日历 -->
    <div class="bg-white/80 backdrop-blur rounded-xl p-2 shadow-sm flex gap-1 pointer-events-auto">
        <div 
          v-for="(day, index) in weekDays" 
          :key="index"
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
          :class="day.checked ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-400 border-gray-200'"
        >
          {{ day.label }}
        </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();

const streak = computed(() => userStore.dailyStreak || 0); // 兜底
const isTodayCheckedIn = computed(() => userStore.isTodayCheckedIn);

const weekDays = computed(() => {
    const checkInDates = userStore.checkInDates || [];
    
    const days = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // 同样的本地时间修正
        const offset = d.getTimezoneOffset() * 60000;
        const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
        
        const isChecked = checkInDates.includes(dateStr);
        days.push({
            label: d.getDate(), 
            checked: isChecked
        });
    }
    days.push({ label: '?', checked: false });
    return days;
});
</script>