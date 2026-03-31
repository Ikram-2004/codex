import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite reads .env from the project root by default.
  // Explicitly set it here to avoid any ambiguity.
  envDir: path.resolve(__dirname, '.'),
  server: {
    port: 5173,
  },
})
