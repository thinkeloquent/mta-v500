/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_CHAT_WINDOW_CONFIG_SERVER_API_URL: string;
  readonly VITE_APP_CHAT_WINDOW_CONFIG_AI_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
