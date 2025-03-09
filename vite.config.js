import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        index: 'src/index.html',
        learn: 'src/learn.html',
      },
    },
  },
});
