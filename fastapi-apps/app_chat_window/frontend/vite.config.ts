import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  loadEnv(mode, process.cwd(), '');

  return {
    base: '/static/app/chat-window/frontend/dist/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      proxy: {
        '/api/ai-sdk-examples': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    // Expose specific env variables to the client
    define: {
      'import.meta.env.VITE_APP_CHAT_WINDOW_CONFIG_SERVER_API_URL': JSON.stringify(''),
      'import.meta.env.VITE_APP_CHAT_WINDOW_CONFIG_AI_MODEL': JSON.stringify(
        process.env.VITE_APP_CHAT_WINDOW_CONFIG_AI_MODEL || process.env.APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL || 'gpt-4o',
      ),
    },
  };
});
