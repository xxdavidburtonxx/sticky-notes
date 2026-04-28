import { defineConfig } from 'vite';

// Entry `src/preload.ts` produces `preload.js`, which is loaded at
// `path.join(__dirname, 'preload.js')` in main.ts.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
