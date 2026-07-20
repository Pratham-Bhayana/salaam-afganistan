import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Pin the project root to this app so Vercel/build tools don't infer the monorepo parent
  // when sibling lockfiles (website, admin-panel, backend) are present.
  root: path.resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
});
