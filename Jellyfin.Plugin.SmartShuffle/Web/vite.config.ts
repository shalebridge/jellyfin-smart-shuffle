import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: '../Configuration',
    emptyOutDir: false,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.ts'),
      output: {
        entryFileNames: 'smartshuffle-dashboard.js',
        assetFileNames: 'smartshuffle-dashboard.css',
        format: 'iife',
        name: 'SmartShuffleDashboard'
      }
    }
  }
});