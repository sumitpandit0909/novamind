import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure VITE_API_URL is available at build time
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000')
  }
})