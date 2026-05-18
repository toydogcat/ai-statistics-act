import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '大考測驗分析與線上統計平台',
        short_name: '線上統計平台',
        description: '專為論文與大考分析打造的古典測驗理論 (CTT)、項目反應理論 (IRT) 與認知診斷模型 (CDM) 線上智慧統計分析套件',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/ai-statistics-act/',
})
