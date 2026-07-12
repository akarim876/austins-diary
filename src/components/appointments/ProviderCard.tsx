import { ChevronRight, Mail, Phone } from 'lucide-react'
import { ModuleIcon } from '../ui/ModuleIcon'
import { ROLE_COLORS } from '../../lib/appointmentConstants'
import type { Provider, ProviderRole } from '../../types'

interface Props {
  provider: Provider
  appointmentCount?: number
  onClick?: () => void
}

export function ProviderCard({ provider, appointmentCount, onClick }: Props) {
  const displayRole = provider.role === 'Other' && provider.role_other
    ? provider.role_other
    : provider.role

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-warm-200 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-rose-200 active:scale-[0.99]' : ''
      }`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ModuleIcon name="appointments" className="w-4 h-4 text-rose-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{provider.name}</p>
                {provider.organization && (
                  <p className="text-xs text-gray-500 mt-0.5">{provider.organization}</p>
                )}
              </div>
              {onClick && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[provider.role as ProviderRole]}`}>
                {displayRole}
              </span>
              {appointmentCount !== undefined && appointmentCount > 0 && (
                <span className="text-xs text-gray-400">
                  {appointmentCount} appt{appointmentCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {(provider.phone || provider.email) && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {provider.phone && (
                  <a href={`tel:${provider.phone}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition">
                    <Phone className="w-3 h-3" />
                    {provider.phone}
                  </a>
                )}
                {provider.email && (
                  <a href={`mailto:${provider.email}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition">
                    <Mail className="w-3 h-3" />
                    {provider.email}
                  </a>
                )}
              </div>
            )}

            {provider.notes && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed italic">
                {provider.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
