import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base path for production build
  // This should match how the FastAPI backend serves static files
  base: '/static/app/google-gemini-openai-chat-completions/frontend/dist/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API requests to FastAPI backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Clean filenames without hashes for predictable paths
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
