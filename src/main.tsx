import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './styles/app.css'
import App from './App.tsx'
import { APP_NAME } from './lib/config'

document.title = APP_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <SpeedInsights />
    </>
  </StrictMode>,
)
