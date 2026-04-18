import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // @ffmpeg/ffmpeg spawns a web worker via `new URL('./worker.js', import.meta.url)`.
    // Vite's pre-bundler breaks that relative resolution silently, so exclude it.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
