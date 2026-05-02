import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Change this to match your GitHub repo name exactly
// e.g. if your repo is github.com/Neilblaze/URL-Dinogame → '/URL-Dinogame/'
const REPO_NAME = '/URL-Dinogame/';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use '/' for dev, REPO_NAME for production build
  base: command === 'serve' ? '/' : REPO_NAME,
  build: {
    outDir: 'dist',
    assetsDir: 'assets-vite',
    // Prevent Vite from hashing filenames in public/ — vanilla JS files
    // loaded via <script> tags need predictable names
    rollupOptions: {
      output: {
        assetFileNames: 'assets-vite/[name]-[hash][extname]',
        chunkFileNames: 'assets-vite/[name]-[hash].js',
        entryFileNames: 'assets-vite/[name]-[hash].js',
      },
    },
  },
}));
