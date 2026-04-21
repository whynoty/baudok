/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'BauDok – Bautagesberichte',
        short_name: 'BauDok',
        description: 'Bautagesberichte leicht gemacht – KI-gestützte Dokumentation für Handwerker',
        theme_color: '#1a6b3c',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['business', 'productivity'],
        lang: 'de',
      },
      workbox: {
        importScripts: ['/sw-notifications.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/reports\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-reports',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/projects\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-projects',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/media\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-photos',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
