import type { ReactNode } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import { useTheme } from './hooks/useTheme'
import { useProfile } from './contexts/ProfileContext'
import { useMyRole } from './hooks/useMyRole'
import { useSetupWizard } from './hooks/useSetupWizard'
import { useCaregiverWelcome } from './hooks/useCaregiverWelcome'
import { AuthPage } from './components/auth/AuthPage'
import { AppHeader } from './components/layout/AppHeader'
import { BottomNav } from './components/layout/BottomNav'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
// Core, always-needed screens (bottom-nav tabs reachable on first paint) stay
// eagerly bundled. Everything else is route-split with React.lazy() so the
// initial JS payload doesn't include settings, exports, calendars, etc. that
// most sessions never visit.
import { DashboardPage } from './pages/DashboardPage'
import { LogPage } from './pages/LogPage'
import { Spinner } from './components/ui/Spinner'
import { InstallPrompt } from './components/ui/InstallPrompt'
import { AppLogo } from './components/ui/AppLogo'

const SetupWizard        = lazy(() => import('./components/onboarding/SetupWizard').then(m => ({ default: m.SetupWizard })))
const CaregiverWelcome   = lazy(() => import('./components/onboarding/CaregiverWelcome').then(m => ({ default: m.CaregiverWelcome })))
const ProfileSetupPage   = lazy(() => import('./components/profile/ProfileSetupPage').then(m => ({ default: m.ProfileSetupPage })))
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage').then(m => ({ default: m.CompleteProfilePage })))
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const AcceptInvitePage   = lazy(() => import('./pages/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })))
const LandingPage        = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))

const DiaryPage             = lazy(() => import('./pages/DiaryPage').then(m => ({ default: m.DiaryPage })))
const ExportPage            = lazy(() => import('./pages/ExportPage').then(m => ({ default: m.ExportPage })))
const CalendarPage          = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SettingsPage          = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const GoalsPage             = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })))
const GoalDetailPage        = lazy(() => import('./pages/GoalDetailPage').then(m => ({ default: m.GoalDetailPage })))
const ProvidersPage         = lazy(() => import('./pages/ProvidersPage').then(m => ({ default: m.ProvidersPage })))
const ProviderDetailPage    = lazy(() => import('./pages/ProviderDetailPage').then(m => ({ default: m.ProviderDetailPage })))
const DietSettingsPage      = lazy(() => import('./pages/DietSettingsPage').then(m => ({ default: m.DietSettingsPage })))
const ScheduleSettingsPage  = lazy(() => import('./pages/ScheduleSettingsPage').then(m => ({ default: m.ScheduleSettingsPage })))
const TrackerSettingsPage   = lazy(() => import('./pages/TrackerSettingsPage').then(m => ({ default: m.TrackerSettingsPage })))

/** Full-screen branded loading screen: logo above a small spinner. */
function FullScreenLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 min-h-dvh"
      style={{ background: 'var(--color-background)' }}
    >
      <AppLogo className="h-16" />
      <Spinner className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
    </div>
  )
}

/**
 * Manages the first-time setup wizard (owners) and caregiver welcome flow.
 * Rendered inside AppShell so it has access to auth + profile context.
 */
function WizardController() {
  const { user } = useAuth()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)
  const isOwner = myRole === 'owner'

  const { shouldAutoShow, savedStep, markDone, dismiss } = useSetupWizard(activeProfile?.id ?? null)
  const { shouldShow: showCaregiverWelcome, markSeen } = useCaregiverWelcome(
    user?.id ?? null,
    activeProfile?.id ?? null
  )

  const [ownerWizardOpen, setOwnerWizardOpen] = useState(false)
  const [caregiverOpen, setCaregiverOpen] = useState(false)

  // Determine which flow to show once the role is known
  useEffect(() => {
    if (myRole === null || !activeProfile || !user) return
    if (isOwner && shouldAutoShow) {
      setOwnerWizardOpen(true)
    } else if (!isOwner && showCaregiverWelcome) {
      setCaregiverOpen(true)
    }
  }, [myRole, isOwner, shouldAutoShow, showCaregiverWelcome, activeProfile, user])

  if (!activeProfile || !user) return null

  return (
    <Suspense fallback={null}>
      {ownerWizardOpen && (
        <SetupWizard
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          userId={user.id}
          initialStep={savedStep}
          onClose={(step) => { dismiss(step); setOwnerWizardOpen(false) }}
          onComplete={() => { markDone(); setOwnerWizardOpen(false) }}
        />
      )}
      {caregiverOpen && (
        <CaregiverWelcome
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          userId={user.id}
          onClose={() => { markSeen(); setCaregiverOpen(false) }}
        />
      )}
    </Suspense>
  )
}

function AppShell() {
  const { activeProfile, loading } = useProfile()
  const { userProfile, userProfileLoaded, reloadUserProfile } = useAuth()
  const location = useLocation()

  const combinedLoading = loading || !userProfileLoaded

  if (combinedLoading) {
    return <FullScreenLoader />
  }

  // First-time user: must set their name before anything else
  if (!userProfile) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <CompleteProfilePage onComplete={reloadUserProfile} />
      </Suspense>
    )
  }

  // No child profiles yet → show profile setup
  if (!activeProfile) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <ProfileSetupPage />
      </Suspense>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--color-background)' }}>
      <WizardController />
      <AppHeader />
      <main className="flex-1 flex flex-col">
        <div key={location.pathname} className="flex-1 flex flex-col">
          <ErrorBoundary fallback={(_err, retry) => (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Something went wrong loading this page.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retry}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition"
                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-warm-100)' }}
                >
                  Reload app
                </button>
              </div>
            </div>
          )}>
            <Suspense fallback={<FullScreenLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}

/**
 * Reads the user's stored theme, applies data-theme to <html>, and keeps the
 * PWA theme-color meta tag in sync so the browser chrome matches the active theme.
 */
function ThemeApplier() {
  useTheme()

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent')
        .trim()
      if (accent) {
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', accent)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return null
}

export default function App() {
  const { session, loading, isPasswordRecovery } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullScreenLoader />
  }

  // Public / recovery routes (no AppShell)
  if (isPasswordRecovery) {
    return (
      <>
        <ThemeApplier />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            },
          }}
        />
        <Suspense fallback={<FullScreenLoader />}>
          <ResetPasswordPage />
        </Suspense>
      </>
    )
  }

  if (!session) {
    let publicPage: ReactNode
    if (location.pathname === '/auth') {
      const params = new URLSearchParams(location.search)
      const initialMode = params.get('mode') === 'signup' ? 'register' : 'login'
      publicPage = <AuthPage initialMode={initialMode} />
    } else if (location.pathname === '/accept-invite') {
      publicPage = <AuthPage />
    } else {
      publicPage = <LandingPage />
    }
    return (
      <>
        <ThemeApplier />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            },
          }}
        />
        <Suspense fallback={<FullScreenLoader />}>
          {publicPage}
        </Suspense>
      </>
    )
  }

  if (location.pathname === '/accept-invite') {
    return (
      <>
        <ThemeApplier />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            },
          }}
        />
        <Suspense fallback={<FullScreenLoader />}>
          <AcceptInvitePage />
        </Suspense>
      </>
    )
  }

  // Authenticated app — layout route + nested pages (Outlet)
  return (
    <>
      <ThemeApplier />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '8px',
            background: '#fff',
            color: '#111827',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          },
        }}
      />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard"         element={<DashboardPage />} />
          <Route path="/log"               element={<LogPage />} />
          <Route path="/diary"             element={<DiaryPage />} />
          <Route path="/calendar"          element={<CalendarPage />} />
          <Route path="/goals"             element={<GoalsPage />} />
          <Route path="/goals/:id"         element={<GoalDetailPage />} />
          <Route path="/providers"         element={<ProvidersPage />} />
          <Route path="/providers/:id"     element={<ProviderDetailPage />} />
          <Route path="/settings"          element={<SettingsPage />} />
          <Route path="/diet-settings"     element={<DietSettingsPage />} />
          <Route path="/schedule-settings" element={<ScheduleSettingsPage />} />
          <Route path="/tracker-settings"  element={<TrackerSettingsPage />} />
          <Route path="/export"            element={<ExportPage />} />
          <Route path="/profile"           element={<Navigate to="/settings?section=account" replace />} />
          <Route path="*"                  element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  )
}
