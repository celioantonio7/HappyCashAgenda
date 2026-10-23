import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger(), VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
    manifest: { id: '/', name: 'HappyCash Agenda', short_name: 'Agenda', description: 'Sua barbearia, seus horários e seus atendimentos.', lang: 'pt-BR', start_url: '/', scope: '/', display: 'standalone', background_color: '#090B0A', theme_color: '#090B0A', icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] },
    workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], globIgnores: ['referencia/**'], maximumFileSizeToCacheInBytes: 4000000, navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/auth\/v1/, /^\/rest\/v1/], cleanupOutdatedCaches: true },
    devOptions: { enabled: false },
  })].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
