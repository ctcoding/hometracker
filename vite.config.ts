import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'icon.svg'],
      manifest: {
        name: 'HausTracker - Wärmezähler App',
        short_name: 'HausTracker',
        description: 'Wärmezähler-Ablesung mit Kamera-OCR und Kostenprognose',
        theme_color: '#F97316',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['utilities', 'productivity'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.haustracker\.(de|local)\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5273,
    https: fs.existsSync(path.resolve(__dirname, '.cert/localhost+4-key.pem')) ? {
      key: fs.readFileSync(path.resolve(__dirname, '.cert/localhost+4-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '.cert/localhost+4.pem')),
    } : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3331',
        changeOrigin: true,
      },
    },
  },
})
