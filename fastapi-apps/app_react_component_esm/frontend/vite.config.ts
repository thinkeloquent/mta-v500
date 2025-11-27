import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Compute basename from parent folder name
// Example: app/react_component_esm -> /apps/react-component-esm
const parentFolder = path.basename(path.resolve(__dirname, '..'));
const urlPath = parentFolder.replace(/_/g, '-');
const basename = `/apps/${urlPath}`;

// https://vite.dev/config/
// Note: import.meta.env.DEV is true when running 'npm run dev', false when running 'npm run build'
export default defineConfig({
  plugins: [react()],
  base: '/static/app/react-component-esm/frontend/dist/',
  define: {
    __APP_BASENAME__: JSON.stringify(basename),
  },
  server: {
    host: '0.0.0.0',
    port: 5174, // Different port from persona-editor (5173)
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Output clean filenames without hashes: <name>.<ext>
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        manualChunks: {
          // Vendor chunk for React and React-DOM to ensure single instance
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Monaco Editor in separate chunk
          monaco: ['@monaco-editor/react', 'monaco-editor'],
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
