import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:80',
      '/api': 'http://localhost:80',
      '/fx': 'http://localhost:80',
      '/notifications': 'http://localhost:80',
    },
  },
});
