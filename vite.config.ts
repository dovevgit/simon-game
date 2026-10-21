/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://dovevgit.github.io/simon-game/ — keep the same base in every environment.
const BASE = '/simon-game/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      // Never reload on its own: a new version waits until every app window is closed (no prompt shown).
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        // Fixed forever, so a future rename or URL change keeps existing installs.
        id: `${BASE}app`,
        name: 'דובב',
        short_name: 'דובב',
        description: 'משחק זיכרון: חזרו על רצף הצבעים והצלילים עד שלב 10.',
        lang: 'he',
        dir: 'rtl',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline, including the Heebo font files.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
