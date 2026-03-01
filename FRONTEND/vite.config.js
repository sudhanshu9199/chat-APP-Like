import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate', //Automatically updates the service worker in the bg
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'connectX',
        short_name: 'connectX',
        description: 'connectX | chat with anyone',
        theme_color: '#2579ff',
        background_color: '#2579ff',
        display: 'standalone',
        icons: [
        ]
      },
      workbox: {
        // Caches JS, CSS, HTML, and images for offline support
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,mp3,jpg,jpeg}']
      }
    })
  ],
})
