import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração de Build para Samsung Smart TV (Tizen OS 4.0+)
export default defineConfig({
  plugins: [react()],
  base: './', // Obrigatório para Tizen Widgets rodando via file:///
  server: {
    port: 3002,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2018', // Compatível com Chromium 56+ do Tizen 4.0 em diante
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-hls': ['hls.js'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});
