import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
        target: 'https://aqua.icybit.cn',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://aqua.icybit.cn',
        changeOrigin: true,
        secure: true,
      },
      '/d': {
        target: 'https://aqua.icybit.cn',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
