import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In dev, forward the Express API routes to the backend (default port 3000).
const api = 'http://localhost:5000';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/vision-assist': api, '/chat': api, '/tts': api, '/health': api, '/languages': api } },
});
