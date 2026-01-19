# 汉字小火车 (Hanzi Express)

专为 5-7 岁儿童设计的游戏化识字 Web 应用。

## 🚂 核心功能
*   **游戏化学习**：通过听音选字收集火车车厢。
*   **即时纠错**：答错时强制纠正，并加入本关复习队列。
*   **记忆曲线**：内置艾宾浩斯复习算法，智能追踪汉字掌握度。
*   **家长中心**：受密码保护的后台，查看学习报告和管理进度。

## 🛠️ 技术栈
*   Vue 3 + Pinia + Vue Router
*   TailwindCSS
*   Web Speech API (TTS)
*   Web Audio API (音效)

## 📦 如何运行

### 开发环境
```bash
npm install
npm run dev
```

### 生产环境打包
```bash
npm run build
```
打包后的文件位于 `dist/` 目录，可直接部署到 Nginx, Vercel, Netlify 或 GitHub Pages。

## 📂 项目结构
*   `src/data/`: 汉字库与关卡配置 (JSON)
*   `src/stores/`: 游戏状态管理 (GameStore, UserStore)
*   `src/views/`: 页面组件 (Game, Result, Garage, Parent)

## ⚠️ 注意事项
*   本 MVP 版本使用了浏览器自带的 TTS 语音合成，不同设备的发音可能略有差异。
*   推荐在 Chrome 或 Safari 浏览器中运行以获得最佳音频体验。