import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      useTransitions={false}: react-router-dom's BrowserRouter defaults to
      wrapping every location update in React.startTransition(). The browser
      history updates immediately (so the address bar changes), but the React
      state feeding useLocation() is low-priority and can be perpetually
      starved by other renders — which is exactly what caused navbar taps to
      change the URL without ever updating the visible page. Opting out makes
      navigation updates synchronous/normal-priority again.
    */}
    <BrowserRouter useTransitions={false}>
      <AuthProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
