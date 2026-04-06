import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:5001'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/upload': { target: backendTarget, changeOrigin: true },
        '/verify': { target: backendTarget, changeOrigin: true },
        '/documents': { target: backendTarget, changeOrigin: true },
        '/access': { target: backendTarget, changeOrigin: true },
        '/health': { target: backendTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
