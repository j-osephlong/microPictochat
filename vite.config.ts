import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: false
      },
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'microPictochat',
        short_name: 'mPicto',
        description: 'Pictochat without backend woes.',
        theme_color: '#544eab',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any'
          }
        ]
      }
    })
  ],
})
