import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env1 = loadEnv(mode, process.cwd(), '')
  const proxy1 =
    env1.VITE_DEV_PROXY_TARGET?.trim() ||
    env1.VITE_AQUA_HOST?.trim() ||
    'http://127.0.0.1:8080'
  const target1 = proxy1.replace(/\/$/, '')

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
          target: target1,
          changeOrigin: true,
          secure: target1.startsWith('https://'),
        },
        '/uploads': {
          target: target1,
          changeOrigin: true,
          secure: target1.startsWith('https://'),
        },
        '/d': {
          target: target1,
          changeOrigin: true,
          secure: target1.startsWith('https://'),
        },
      },
    },
  }
})
