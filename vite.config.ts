import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['my-archive-icon-180.png'],
      manifest: {
        id: './',
        name: 'Fashion Archive',
        short_name: 'My Archive',
        lang: 'ja',
        description: '写真でつくる、私だけのファッションアーカイブ。',
        theme_color: '#f7f3ed',
        background_color: '#f7f3ed',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        icons: [
          { src: 'my-archive-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'my-archive-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html'
      }
    })
  ]
})
