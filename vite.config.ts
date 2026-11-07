import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isDesktop = !!process.env.TAURI_ENV_PLATFORM || process.env.VITE_IS_DESKTOP === 'true'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', '.claude/**'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      disable: isDesktop,
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'واجباتي',
        short_name: 'واجباتي',
        description: 'واجباتي — متابعة الواجبات اليومية لطلاب اعدادية الرميلة للبنين',
        lang: 'ar', dir: 'rtl',
        start_url: '/', display: 'standalone',
        background_color: '#F8FAFC', theme_color: '#007BFE',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
