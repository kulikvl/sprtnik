import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: '', // Generate relative URLs for all assets (no leading slash).
  build: {
    target: 'esnext',
    outDir: '../dist',
    emptyOutDir: true,
  },
});
