import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// docs/ARCHITECTURE.md: API'ye internetten değil sadece lokalden erişilir,
// bu yüzden CORS altyapısı yerine Vite dev proxy kullanılıyor — src/api
// hiçbir cross-origin ayarı bilmek zorunda kalmıyor.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
