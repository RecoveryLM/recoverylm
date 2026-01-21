import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load .env files (with empty prefix to load all vars, not just VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  // Priority: .env file VITE_ var > .env file non-VITE_ var > system env var
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ''

  // Debug: log whether key was found (don't log the actual key)
  console.log('Anthropic API key configured:', anthropicKey ? 'YES' : 'NO')

  return {
    define: {
      // Inject the API key so it's available via import.meta.env
      'import.meta.env.VITE_ANTHROPIC_API_KEY': JSON.stringify(anthropicKey)
    },
    plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'RecoveryLM',
        short_name: 'RecoveryLM',
        description: 'Privacy-first addiction recovery companion',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
  }
})
