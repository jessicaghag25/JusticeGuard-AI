import { defineConfig } from 'vite';

// Vite proxy points frontend API calls to Express during local development.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT || 5173),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 3001}`,
        changeOrigin: true
      }
    }
  }
});
