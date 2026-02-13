import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { db } from './utils/db'
import { authApi } from './utils/api'

import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

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
      if (rippleEl) rippleEl.remove();
      el.appendChild(circle);
    });
  }
};

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueVirtualScroller)
app.directive('ripple', ripple)

// ★ 启动前：根据当前登录账号设置 DB 前缀
const userId = authApi.getUserId();
db.setUser(userId);

const userStore = useUserStore()
userStore.init().then(() => {
  app.mount('#app')
})