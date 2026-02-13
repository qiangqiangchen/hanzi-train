<template>
  <div class="w-full h-48">
    <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    <div v-else class="h-full flex items-center justify-center text-gray-400 text-sm">
      暂无学习数据
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
});

const chartData = computed(() => {
  if (!props.history || props.history.length === 0) return null;

  return {
    labels: props.history.map(h => h.date),
    datasets: [
      {
        label: '学习字数',
        data: props.history.map(h => h.count || h.chars_count || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y} 个字`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        precision: 0,
      },
      grid: {
        color: 'rgba(0,0,0,0.05)',
      },
    },
    x: {
      grid: { display: false },
    },
  },
};
</script>