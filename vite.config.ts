import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

function commandOutput(command: string) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function formatBuildTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('/') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy =
    env.VITE_DEV_PROXY_TARGET?.trim() ||
    env.VITE_AQUA_HOST?.trim() ||
    'http://127.0.0.1:8080'
  const target = proxy.replace(/\/$/, '')
  // Vercel CLI 部署时源码不带 .git，构建容器里 git rev-parse 会失败。
  // 优先用 VERCEL_GIT_COMMIT_SHA(Vercel git 集成自动注入;CLI 部署可用 --build-env 传入)。
  const envCommit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').trim()
  const buildInfo = {
    commit: envCommit.slice(0, 7) || commandOutput('git rev-parse --short=7 HEAD') || 'unknown',
    builtAt: formatBuildTime(new Date()),
    bunVersion: process.versions.bun || commandOutput('bun --version') || 'unknown',
  }

  return {
    define: {
      __BUILD_INFO__: JSON.stringify(buildInfo),
    },
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
