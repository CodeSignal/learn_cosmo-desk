import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DEV_PORT = Number(process.env.VITE_PORT || 3000);
const API_PORT = Number(process.env.API_PORT || 3001);

export default defineConfig({
  root: './client',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
    proxy: {
      '/api': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: true },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
