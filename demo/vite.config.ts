import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/react-shahmat/',
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from the parent directory (symlinked library)
      allow: ['..'],
    },
  },
  build: {
    outDir: 'build',
  },
});
