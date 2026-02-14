import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue(),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz',
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg',
          'images/**/*.png', 'images/**/*.svg', 'audio/sfx/*.mp3'
        ],
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
          // 生产环境不缓存 API 请求
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/audio/chars/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-chars-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
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
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'data-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              },
            }
          ]
        }
      })
    ],
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
            'vendor-charts': ['chart.js', 'vue-chartjs'],
            'vendor-hanzi': ['hanzi-writer'],
            'vendor-utils': ['canvas-confetti', 'howler', 'idb-keyval', 'axios']
          }
        }
      }
    },
    // 开发时代理后端（可选，替代 CORS）
    server: {
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/static': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      } : undefined
    }
  }
})