# ReaChat - AI Chat Interface

A modern, responsive chat interface built with React, TypeScript, and Vite. Features real-time streaming responses from OpenAI or Anthropic AI models.

## Features

- Real-time AI chat with streaming responses
- Support for both OpenAI and Anthropic APIs
- Configurable via environment variables
- Modern, glassmorphic UI design
- Responsive layout for mobile and desktop
- Loading states and error handling
- Fallback echo mode when no API is configured

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AI Provider:**

   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your preferred AI provider:

   **For OpenAI:**
   ```env
   VITE_AI_PROVIDER=openai
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENAI_MODEL=gpt-4o
   ```

   **For Anthropic:**
   ```env
   VITE_AI_PROVIDER=anthropic
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   VITE_ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_AI_PROVIDER` | AI provider to use (`openai` or `anthropic`) | Yes | `openai` |
| `VITE_OPENAI_API_KEY` | Your OpenAI API key | If using OpenAI | - |
| `VITE_OPENAI_MODEL` | OpenAI model to use | No | `gpt-4o` |
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key | If using Anthropic | - |
| `VITE_ANTHROPIC_MODEL` | Anthropic model to use | No | `claude-3-5-sonnet-20241022` |

## Security Note

⚠️ **Important:** This implementation uses `dangerouslyAllowBrowser: true` for the AI SDKs, which exposes your API keys in the browser. This is suitable for development and demos only.

**For production, you should:**
- Create a backend API proxy to handle AI requests
- Store API keys securely on the server
- Implement rate limiting and authentication
- Never expose API keys in client-side code

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **OpenAI SDK** - OpenAI API integration
- **Anthropic SDK** - Anthropic API integration

---

# React + TypeScript + Vite Template Info

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
