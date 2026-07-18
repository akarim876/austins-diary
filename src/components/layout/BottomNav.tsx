import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Plus } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { GlobalRecordButton } from '../audio/GlobalRecordButton'

const LEFT_TABS: {
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

function Tab({ to, renderIcon, label }: typeof LEFT_TABS[number]) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className="flex-1 flex items-center justify-center focus-visible:outline-none"
    >
      {({ isActive }) => (
        <span
          className="flex items-center justify-center transition-all duration-200"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isActive ? 'var(--color-text)' : 'rgba(51,50,46,0.07)',
          }}
        >
          {renderIcon(
            'w-5 h-5 transition-colors',
            isActive ? '#fff' : 'var(--color-text-muted)',
          )}
        </span>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div
        className="relative max-w-lg mx-auto flex items-center h-16 px-2"
        style={{
          background:           'var(--color-surface-blur)',
          backdropFilter:       'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop:            '1px solid rgba(237,233,227,0.8)',
          boxShadow:            '0 -2px 20px rgba(51,50,46,0.08)',
        }}
      >
        {LEFT_TABS.map(t => <Tab key={t.to} {...t} />)}

        {/* Center FAB slot */}
        <div className="flex-shrink-0 w-20 flex items-center justify-center">
          <GlobalRecordButton />
        </div>

        {RIGHT_TABS.map(t => <Tab key={t.to} {...t} />)}
      </div>

      {/* iOS safe area fill */}
      <div className="h-safe-bottom" style={{ background: 'var(--color-surface-blur)' }} />
    </nav>
  )
}
