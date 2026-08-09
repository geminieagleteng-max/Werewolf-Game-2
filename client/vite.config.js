import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 確保 GitHub Pages 子路徑資源正確載入
  server: {
    port: 5173,
  },
});
