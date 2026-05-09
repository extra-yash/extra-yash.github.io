import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/brand/',
    build: {
      outDir: '../brand',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          strategy:   path.resolve(__dirname, 'strategy/index.html'),
          operations: path.resolve(__dirname, 'operations/index.html'),
          visual:     path.resolve(__dirname, 'visual/index.html'),
          scrapbook:  path.resolve(__dirname, 'scrapbook/index.html'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
