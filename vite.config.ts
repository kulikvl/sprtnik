import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: '/sprtnik/',
  build: {
    target: 'esnext',
    outDir: '../dist',
    emptyOutDir: true,
  },
});
