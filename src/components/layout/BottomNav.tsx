import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Plus, Settings } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'

// Each item either renders a Lucide icon or a ModuleIcon.
// Using a renderIcon function keeps the map loop uniform.
const NAV_ITEMS: {
  to: string
  label: string
  renderIcon: (cls: string, col: string) => ReactElement
}[] = [
  {
    to: '/dashboard',
    label: 'Today',
    renderIcon: (cls, col) => <LayoutDashboard className={cls} style={{ color: col }} />,
  },
  {
    to: '/goals',
    label: 'Goals',
    renderIcon: (cls, col) => <ModuleIcon name="goals" className={cls} style={{ color: col }} />,
  },
  {
    to: '/log',
    label: 'Log',
    renderIcon: (cls, col) => <Plus className={cls} style={{ color: col }} />,
  },
  {
    to: '/calendar',
    label: 'History',
    renderIcon: (cls, col) => <CalendarDays className={cls} style={{ color: col }} />,
  },
  {
    to: '/settings',
    label: 'Settings',
    renderIcon: (cls, col) => <Settings className={cls} style={{ color: col }} />,
  },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Frosted glass surface */}
      <div
        className="flex max-w-lg mx-auto px-2"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(237,233,227,0.8)',
          boxShadow: '0 -2px 20px rgba(51,50,46,0.08)',
        }}
      >
        {NAV_ITEMS.map(({ to, renderIcon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
          >
            {({ isActive }) => (
              <>
                <span
                  className="w-12 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
                  style={{ background: isActive ? '#5B7B7A' : 'transparent' }}
                >
                  {renderIcon('w-5 h-5 transition-colors', isActive ? '#fff' : '#9A9187')}
                </span>
                <span
                  className="text-[10px] font-semibold transition-colors"
                  style={{ color: isActive ? '#5B7B7A' : '#9A9187' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* iOS safe area spacer */}
      <div className="h-safe-bottom" style={{ background: 'rgba(255,255,255,0.92)' }} />
    </nav>
  )
}
