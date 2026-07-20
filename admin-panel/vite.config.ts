import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Pin the project root to this app so Vercel/build tools don't infer the monorepo parent
  // when sibling lockfiles (website, embassy, backend) are present.
  root: path.resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
