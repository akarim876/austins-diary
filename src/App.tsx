import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import { useProfile } from './contexts/ProfileContext'
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
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { Spinner } from './components/ui/Spinner'

function AppShell() {
  const { activeProfile, loading } = useProfile()
  const { userProfile, userProfileLoaded, reloadUserProfile } = useAuth()

  const combinedLoading = loading || !userProfileLoaded

  if (combinedLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Spinner className="w-10 h-10" />
      </div>
    )
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
    <div className="flex flex-col min-h-dvh bg-warm-100">
      <AppHeader />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/log"                element={<LogPage />} />
          <Route path="/diary"              element={<DiaryPage />} />
          <Route path="/calendar"           element={<CalendarPage />} />
          <Route path="/goals"              element={<GoalsPage />} />
          <Route path="/goals/:id"          element={<GoalDetailPage />} />
          <Route path="/providers"          element={<ProvidersPage />} />
          <Route path="/providers/:id"      element={<ProviderDetailPage />} />
          <Route path="/settings"           element={<SettingsPage />} />
          <Route path="/diet-settings"      element={<DietSettingsPage />} />
          <Route path="/schedule-settings"  element={<ScheduleSettingsPage />} />
          <Route path="/export"             element={<ExportPage />} />
          {/* Redirects */}
          <Route path="/profile"            element={<Navigate to="/settings" replace />} />
          <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  let content: ReactNode
  if (!session) {
    content = <AuthPage />
  } else if (location.pathname === '/accept-invite') {
    content = <AcceptInvitePage />
  } else {
    content = <AppShell />
  }

  return (
    <>
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
      {content}
    </>
  )
}
