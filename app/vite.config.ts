import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Babylon.js + Havok (motor 3D/física) passam do limite padrão de 2MB;
        // ainda vale pré-cachear pra manter o PWA funcional offline.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        // glob padrão do workbox não inclui .hdr/.glb (HDRI + modelos 3D) — sem isso
        // o mundo 3D não funcionaria offline mesmo depois de instalado como PWA.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,hdr,glb}'],
      },
      manifest: {
        name: 'Missão Aprender',
        short_name: 'Missão Aprender',
        description: 'Jogo educativo de missões cooperativas para crianças',
        theme_color: '#f582ae',
        background_color: '#fef6e4',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
