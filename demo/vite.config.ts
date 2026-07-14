import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/react-shahmat/',
  resolve: {
    // react-shahmat is symlinked from the parent directory (file:..), which
    // has its own node_modules. Without dedupe, imports resolved relative to
    // the symlink's real path can pull in a second copy of react/react-dnd.
    dedupe: [
      'react',
      'react-dom',
      'react-dnd',
      'react-dnd-touch-backend',
      'dnd-core',
    ],
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: true,
    fs: {
      // Allow serving files from the parent directory (symlinked library)
      allow: ['..'],
    },
  },
  build: {
    outDir: 'build',
  },
});
