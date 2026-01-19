<template>
  <div class="w-full h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const props = defineProps({
  history: {
    type: Array, // [{date: 'MM-DD', count: 10}]
    default: () => []
  }
});

const chartData = computed(() => ({
  labels: props.history.map(h => h.date),
  datasets: [
    {
      label: '每日识字量',
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
      data: props.history.map(h => h.count),
      tension: 0.4, // 平滑曲线
      pointRadius: 4
    }
  ]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f3f4f6' },
      ticks: { stepSize: 5 }
    },
    x: {
      grid: { display: false }
    }
  }
};
</script>