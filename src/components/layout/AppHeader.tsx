import { LogOut, ChevronDown, Download, Settings, Share2, User, Palette, LayoutGrid, Users, Utensils, CalendarClock, Activity, Baby } from 'lucide-react'
import { AppLogo } from '../ui/AppLogo'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import toast from 'react-hot-toast'

const SETTINGS_LINKS = [
  { label: 'Account',          section: 'account',    path: null,                 Icon: User },
  { label: 'Appearance',       section: 'appearance', path: null,                 Icon: Palette },
  { label: 'Quick-add',        section: 'quick-add',  path: null,                 Icon: LayoutGrid },
  { label: 'Child profiles',   section: 'profiles',   path: null,                 Icon: Baby },
  { label: 'Caregivers',       section: 'caregivers', path: null,                 Icon: Users },
  { label: 'Diet & Nutrition', section: 'diet',       path: '/diet-settings',     Icon: Utensils },
  { label: 'Daily Schedule',   section: 'schedule',   path: '/schedule-settings', Icon: CalendarClock },
  { label: 'Custom Trackers',  section: 'trackers',   path: '/tracker-settings',  Icon: Activity },
] as const

export function AppHeader() {
  const { user, signOut, userProfile } = useAuth()
  const { activeProfile, profiles, setActiveProfile } = useProfile()
  const navigate = useNavigate()

  const displayName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : user?.email ?? ''
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  async function handleShare() {
    setShowSettingsMenu(false)
    const shareData = {
      title: "Austin's Diary",
      text: "A private caregiving journal for tracking daily routines, behaviors, sleep, and more.",
      url: window.location.origin,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.origin)
        toast.success('Link copied to clipboard')
      }
    } catch {
      // User cancelled share — no error needed
    }
  }

  function goToSettingsSection(item: typeof SETTINGS_LINKS[number]) {
    setShowSettingsMenu(false)
    if (item.path) navigate(item.path)
    else navigate(`/settings?section=${item.section}`)
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'var(--color-background-blur)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(237,233,227,0.7)',
        boxShadow: '0 1px 8px rgba(51,50,46,0.05)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <AppLogo className="h-7" />
          <span
            className="font-display font-semibold text-base tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Austin's Diary
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Profile switcher */}
          {activeProfile && profiles.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
              >
                <span className="max-w-[100px] truncate">{activeProfile.name}</span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: 'var(--color-surface)', boxShadow: '0 4px 20px rgba(51,50,46,0.12)' }}
                >
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProfile(p); setShowProfileMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        background: p.id === activeProfile.id ? 'var(--color-accent-subtle)' : 'transparent',
                        color: p.id === activeProfile.id ? 'var(--color-accent)' : 'var(--color-text)',
                        fontWeight: p.id === activeProfile.id ? 600 : 400,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeProfile && profiles.length === 1 && (
            <span
              className="px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              {activeProfile.name}
            </span>
          )}

          {/* Export link */}
          <Link
            to="/export"
            title="Export"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            style={{ color: '#9A9187' }}
          >
            <Download className="w-4 h-4" />
          </Link>

          {/* Settings gear / menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="Settings"
              aria-expanded={showSettingsMenu}
              onClick={() => setShowSettingsMenu(s => !s)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ color: 'var(--color-accent)' }}
            >
              <Settings className="w-5 h-5" />
            </button>
            {showSettingsMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-xl overflow-hidden z-50"
                style={{ background: 'var(--color-surface)', boxShadow: '0 4px 20px rgba(51,50,46,0.12)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(237,233,227,0.8)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{displayName}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                </div>

                <ul className="py-1">
                  {SETTINGS_LINKS.map((item) => (
                    <li key={item.section}>
                      <button
                        type="button"
                        onClick={() => goToSettingsSection(item)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <item.Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>

                <div style={{ borderTop: '1px solid rgba(237,233,227,0.8)' }} />

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
                  style={{ color: 'var(--color-text)' }}
                >
                  <Share2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                  Share app
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss menus on outside click */}
      {(showProfileMenu || showSettingsMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setShowProfileMenu(false); setShowSettingsMenu(false) }}
        />
      )}
    </header>
  )
}
