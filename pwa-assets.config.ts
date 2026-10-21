import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the install icons and favicon from public/icon.svg (run: npm run generate-pwa-assets).
// The output is committed, so CI never runs the generator.
// The SVG already has an opaque background and keeps the board inside the maskable safe zone,
// so no extra padding is added.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
