import { defineConfig } from 'vite';

// Entry filename becomes the output filename — entry `src/main.ts` produces `main.js`,
// which matches `package.json`'s `"main": ".vite/build/main.js"`. Do not override
// `entryFileNames` unless you have a specific reason (and update package.json to match).
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'chokidar', 'fsevents', 'better-sqlite3'],
    },
  },
});
