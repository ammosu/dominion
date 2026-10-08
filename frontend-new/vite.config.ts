import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const wasmPackage = fileURLToPath(new URL('./src/wasm/dominion_wasm.js', import.meta.url));
const wasmStub = fileURLToPath(new URL('./src/services/wasmStub.ts', import.meta.url));

// Override with BACKEND_URL=http://localhost:3300 when port 3000 is taken.
const backend = process.env.BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; set BASE_PATH=/dominion/ there.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      // The in-browser engine (VITE_ENGINE=wasm); a stub when not built.
      'dominion-wasm': existsSync(wasmPackage) ? wasmPackage : wasmStub,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/ws': {
        target: backend.replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
});
