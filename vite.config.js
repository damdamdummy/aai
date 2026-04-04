import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'docs' }
  //,
  // server: {
  //   host: true,
  //   hmr: false,
  //   allowedHosts: true,
  //   origin: 'http://localhost:5173'
  // }
})
