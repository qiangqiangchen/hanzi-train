import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user' // [Day7]

// [Day4] 引入虚拟滚动
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'


// [Day9] 简单的 Ripple 指令实现
const ripple = {
  mounted(el) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.addEventListener('click', (e) => {
      const circle = document.createElement('span');
      const diameter = Math.max(el.clientWidth, el.clientHeight);
      const radius = diameter / 2;
      const rect = el.getBoundingClientRect();
      
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple');
      
      const rippleEl = el.getElementsByClassName('ripple')[0];
      if (rippleEl) {
        rippleEl.remove();
      }
      el.appendChild(circle);
    });
  }
};

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueVirtualScroller) // [Day4] 注册
app.directive('ripple', ripple) // 注册指令

// [Day7] 启动前初始化数据
const userStore = useUserStore()
userStore.init().then(() => {
  // 数据加载完成后再挂载应用，防止页面闪烁（从空数据变有数据）
  // 也可以先挂载，让页面显示 Loading 状态
  app.mount('#app')
})