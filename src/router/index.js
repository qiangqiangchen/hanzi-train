import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Game from '../views/Game.vue';
import Result from '../views/Result.vue';
import Parent from '../views/Parent.vue';
import Garage from '../views/Garage.vue'; // [Day6] 引入 Garage
import Print from '../views/Print.vue';
import Reading from '../views/Reading.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/game/:levelId', name: 'Game', component: Game, props: true },
  { path: '/result', name: 'Result', component: Result },
  { path: '/parent', name: 'Parent', component: Parent },
  { path: '/print', name: 'Print', component: Print },
  { path: '/reading', name: 'Reading', component: Reading },
  { path: '/garage', name: 'Garage', component: Garage } // [Day6] 添加路由
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;