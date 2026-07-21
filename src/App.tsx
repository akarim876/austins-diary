import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import { useTheme } from './hooks/useTheme'
import { useProfile } from './contexts/ProfileContext'
import { useMyRole } from './hooks/useMyRole'
import { useSetupWizard } from './hooks/useSetupWizard'
import { useCaregiverWelcome } from './hooks/useCaregiverWelcome'
import { SetupWizard } from './components/onboarding/SetupWizard'
import { CaregiverWelcome } from './components/onboarding/CaregiverWelcome'
import { AuthPage } from './components/auth/AuthPage'
import { AppHeader } from './components/layout/AppHeader'
import { BottomNav } from './components/layout/BottomNav'
import { DashboardPage } from './pages/DashboardPage'
import { DiaryPage } from './pages/DiaryPage'
import { ExportPage } from './pages/ExportPage'
import { LogPage } from './pages/LogPage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { GoalsPage } from './pages/GoalsPage'
import { GoalDetailPage } from './pages/GoalDetailPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { ProviderDetailPage } from './pages/ProviderDetailPage'
import { ProfileSetupPage } from './components/profile/ProfileSetupPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { DietSettingsPage } from './pages/DietSettingsPage'
import { ScheduleSettingsPage } from './pages/ScheduleSettingsPage'
import { TrackerSettingsPage } from './pages/TrackerSettingsPage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { LandingPage } from './pages/LandingPage'
import { Spinner } from './components/ui/Spinner'
import { InstallPrompt } from './components/ui/InstallPrompt'
import { AppLogo } from './components/ui/AppLogo'

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
    <>
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
    </>
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
    return <CompleteProfilePage onComplete={reloadUserProfile} />
  }

  // No child profiles yet → show profile setup
  if (!activeProfile) {
    return <ProfileSetupPage />
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--color-background)' }}>
      <WizardController />
      <AppHeader />
      <main className="flex-1 flex flex-col">
        <div key={location.pathname} className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}

/**
 * TEMPORARY diagnostic — surfaces otherwise-silent JS errors as toasts and
 * shows the live router location in a small corner badge, so we can see
 * on-screen (without devtools) exactly what happens when navbar taps don't
 * visibly navigate. Safe to remove once the navbar bug is confirmed fixed.
 */
function DebugOverlay() {
  const location = useLocation()

  useEffect(() => {
    function onError(e: ErrorEvent) {
      toast.error(`JS error: ${e.message}`, { duration: 8000 })
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason)
      toast.error(`Unhandled rejection: ${reason}`, { duration: 8000 })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <div
      className="fixed top-1 right-1 z-[9999] px-1.5 py-0.5 rounded text-[9px] font-mono pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
    >
      {location.pathname}
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
        <ResetPasswordPage />
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
        {publicPage}
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
        <AcceptInvitePage />
      </>
    )
  }

  // Authenticated app — layout route + nested pages (Outlet)
  return (
    <>
      <ThemeApplier />
      <DebugOverlay />
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
