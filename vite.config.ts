import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy =
    env.VITE_DEV_PROXY_TARGET?.trim() ||
    env.VITE_AQUA_HOST?.trim() ||
    'http://127.0.0.1:8080'
  const target = proxy.replace(/\/$/, '')

  return {
    plugins: [
      react(),
      Icons({
        autoInstall: false,
        compiler: 'jsx',
        jsx: 'react',
      }),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: target.startsWith('https://'),
        },
        '/uploads': {
          target: target,
          changeOrigin: true,
          secure: target.startsWith('https://'),
        },
        '/d': {
          target: target,
          changeOrigin: true,
          secure: target.startsWith('https://'),
        },
      },
    },
  }
})
