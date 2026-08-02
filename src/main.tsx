import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './styles/app.css'
import App from '@/App.tsx'
import { APP_NAME } from '@/lib/config'
import { initSentry } from '@/lib/sentry'

// 尽量早，要赶在 React 挂载和首批请求之前
initSentry()

document.title = APP_NAME

createRoot(document.getElementById('react-root')!).render(
  <StrictMode>
    <>
      <App />
      <Analytics />
      <SpeedInsights />
    </>
  </StrictMode>,
)
