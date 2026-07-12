import { BookHeart, LogOut, ChevronDown, Download } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import toast from 'react-hot-toast'

export function AppHeader() {
  const { user, signOut, userProfile } = useAuth()
  const { activeProfile, profiles, setActiveProfile } = useProfile()

  const avatarInitials = userProfile
    ? `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?'

  const displayName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : user?.email ?? ''
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(247,245,241,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(237,233,227,0.7)',
        boxShadow: '0 1px 8px rgba(51,50,46,0.05)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <BookHeart className="w-5 h-5" style={{ color: '#5B7B7A' }} />
          <span
            className="font-display font-semibold text-base tracking-tight"
            style={{ color: '#33322E' }}
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
                style={{ background: 'rgba(91,123,122,0.10)', color: '#4a6a69' }}
              >
                <span className="max-w-[100px] truncate">{activeProfile.name}</span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: '#fff', boxShadow: '0 4px 20px rgba(51,50,46,0.12)' }}
                >
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProfile(p); setShowProfileMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        background: p.id === activeProfile.id ? 'rgba(91,123,122,0.08)' : 'transparent',
                        color: p.id === activeProfile.id ? '#4a6a69' : '#33322E',
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
              style={{ background: 'rgba(91,123,122,0.10)', color: '#4a6a69' }}
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

          {/* User avatar / menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(s => !s)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ background: '#5B7B7A', color: '#fff' }}
            >
              {avatarInitials}
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-50"
                style={{ background: '#fff', boxShadow: '0 4px 20px rgba(51,50,46,0.12)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #EDE9E3' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: '#33322E' }}>{displayName}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#9A9187' }}>{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none"
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
      {(showProfileMenu || showUserMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setShowProfileMenu(false); setShowUserMenu(false) }}
        />
      )}
    </header>
  )
}
