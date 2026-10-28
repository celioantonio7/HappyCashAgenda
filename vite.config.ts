import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE_PATH || "/";
  return ({
  base,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: null,
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
    manifest: { id: base, name: 'HappyCash Agenda', short_name: 'Agenda', description: 'Sua barbearia, seus horários e seus atendimentos.', lang: 'pt-BR', start_url: base, scope: base, display: 'standalone', background_color: '#090B0A', theme_color: '#090B0A', icons: [
      { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] },
    workbox: { importScripts: [`${base}push-sw.js`], globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], globIgnores: ['referencia/**'], maximumFileSizeToCacheInBytes: 4000000, navigateFallback: `${base}index.html`, navigateFallbackDenylist: [/^\/auth\/v1/, /^\/rest\/v1/], cleanupOutdatedCaches: true },
    devOptions: { enabled: false },
  })].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
