import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Plus } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { GlobalRecordButton } from '../audio/GlobalRecordButton'

// Two tabs on each side of the central FAB
const LEFT_TABS: { to: string; label: string; renderIcon: (cls: string, col: string) => ReactElement }[] = [
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
]

const RIGHT_TABS: typeof LEFT_TABS = [
  {
    to: '/calendar',
    label: 'History',
    renderIcon: (cls, col) => <CalendarDays className={cls} style={{ color: col }} />,
  },
  {
    to: '/log',
    label: 'Log',
    renderIcon: (cls, col) => <Plus className={cls} style={{ color: col }} />,
  },
]

function Tab({ to, label, renderIcon }: typeof LEFT_TABS[number]) {
  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl"
    >
      {({ isActive }) => (
        <>
          <span
            className="w-11 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
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
  )
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div
        className="relative max-w-lg mx-auto flex items-end"
        style={{
          background:         'rgba(255,255,255,0.92)',
          backdropFilter:     'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop:          '1px solid rgba(237,233,227,0.8)',
          boxShadow:          '0 -2px 20px rgba(51,50,46,0.08)',
        }}
      >
        {/* Left two tabs */}
        {LEFT_TABS.map(t => <Tab key={t.to} {...t} />)}

        {/* Center FAB slot — the GlobalRecordButton rises above the nav surface */}
        <div className="flex-shrink-0 w-20 flex flex-col items-center justify-center py-1.5">
          {/* Raise the button 12px above the nav top edge */}
          <div style={{ marginBottom: 4, transform: 'translateY(-12px)' }}>
            <GlobalRecordButton />
          </div>
        </div>

        {/* Right two tabs */}
        {RIGHT_TABS.map(t => <Tab key={t.to} {...t} />)}
      </div>

      {/* iOS safe area fill */}
      <div className="h-safe-bottom" style={{ background: 'rgba(255,255,255,0.92)' }} />
    </nav>
  )
}
