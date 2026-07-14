import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export type ThemeId = 'sage' | 'terracotta' | 'coastal' | 'plum'

export interface ThemeDef {
  id: ThemeId
  label: string
  bg: string
  accent: string
  secondary: string
  text: string
}

export const THEMES: ThemeDef[] = [
  {
    id: 'sage',
    label: 'Sage',
    bg: '#F7F5F1',
    accent: '#5B7B7A',
    secondary: '#A6A59D',
    text: '#33322E',
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    bg: '#FAF3EC',
    accent: '#C1694F',
    secondary: '#7A9E7E',
    text: '#3A2E28',
  },
  {
    id: 'coastal',
    label: 'Coastal',
    bg: '#F4F7F6',
    accent: '#3E7C7C',
    secondary: '#E3A857',
    text: '#23302E',
  },
  {
    id: 'plum',
    label: 'Plum',
    bg: '#F8F5F3',
    accent: '#7C6A8E',
    secondary: '#93A67C',
    text: '#2E2A30',
  },
]

function storageKey(userId: string | null | undefined): string {
  return userId ? `theme:${userId}` : 'theme:guest'
}

function readStored(key: string): ThemeId {
  try {
    const v = localStorage.getItem(key)
    if (v === 'sage' || v === 'terracotta' || v === 'coastal' || v === 'plum') return v
  } catch {
    // localStorage unavailable
  }
  return 'sage'
}

function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', id)
}

/** Applies and persists the user's chosen color theme per-user via localStorage. */
export function useTheme() {
  const { user } = useAuth()
  const key = storageKey(user?.id)

  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = readStored(storageKey(user?.id))
    applyTheme(stored)
    return stored
  })

  // Re-read when the user changes (sign-in / sign-out)
  useEffect(() => {
    const t = readStored(key)
    setThemeState(t)
    applyTheme(t)
  }, [key])

  const setTheme = useCallback(
    (id: ThemeId) => {
      try { localStorage.setItem(key, id) } catch { /* ignore */ }
      setThemeState(id)
      applyTheme(id)
    },
    [key],
  )

  return { theme, setTheme, themes: THEMES }
}
