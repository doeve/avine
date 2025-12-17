import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 1243,
    hmr: {
      host: 'localhost',
      port: 1243,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Support top-level await for chromaprint WASM
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        offscreen: path.resolve(__dirname, 'src/offscreen/offscreen.html'),
      },
    },
  },
  esbuild: {
    target: 'esnext',
  },
})
