import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { handleAuthBeforeReact } from './auth/authBootstrap'

// Handle OAuth callback before React starts
handleAuthBeforeReact().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})