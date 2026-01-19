import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'; // [Day8]

export default defineConfig({
  plugins: [
    vue(),
    // [Day8] 开启 Gzip 压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 超过10kb才压缩
      algorithm: 'gzip',
      ext: '.gz',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'images/**/*.png', 'images/**/*.svg', 'audio/sfx/*.mp3'],
      manifest: {
        name: '汉字小火车',
        short_name: '汉字火车',
        description: '专为儿童设计的游戏化识字应用',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/chars/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-chars-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                purgeOnQuotaError: true
              },
              cacheableResponse: { statuses: [0, 200] }
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          }
        ]
      }
    })
  ],
  // [Day8] 构建优化
  build: {
    chunkSizeWarningLimit: 1500, // 调大警告阈值 (hanzi-writer比较大)
    rollupOptions: {
      output: {
        // 手动代码分割，将大库拆分出去，防止 vendor.js 过大
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
          'vendor-charts': ['chart.js', 'vue-chartjs'],
          'vendor-hanzi': ['hanzi-writer'],
          'vendor-utils': ['canvas-confetti', 'howler', 'idb-keyval', 'axios']
        }
      }
    }
  }
})