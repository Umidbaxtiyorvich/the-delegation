import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // GitHub Pages deploy uchun API key'ni build'dan olib tashlash
  const isProduction = mode === 'production';
  
  return {
    // Local: http://localhost:3000/  |  GitHub Pages build: set VITE_BASE=/the-delegation/
    base: process.env.VITE_BASE || (isProduction ? '/the-delegation/' : '/'),
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.OPENAI_API_KEY': JSON.stringify(isProduction ? '' : env.OPENAI_API_KEY || ''),
      'process.env.OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
      'process.env.OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL || 'gpt-4o-mini'),
      'process.env.OPENAI_EMBED_MODEL': JSON.stringify(env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
