import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Appointment } from '../types'

function cast(row: unknown): Appointment { return row as Appointment }

/** All appointments for a profile (for calendar dots + full list). */
export function useAppointments(profileId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profileId)
      .order('appt_date', { ascending: false })
    setAppointments((data ?? []).map(cast))
    setLoading(false)
  }, [profileId])

  useEffect(() => { refetch() }, [refetch])
  return { appointments, loading, refetch }
}

/** Appointments for a specific calendar date. */
export function useAppointmentsForDate(profileId: string | null, date: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(false)

  const refetch = useCallback(async () => {
    if (!profileId || !date) return
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profileId)
      .eq('appt_date', date)
      .order('appt_time', { ascending: true, nullsFirst: false })
    setAppointments((data ?? []).map(cast))
    setLoading(false)
  }, [profileId, date])

  useEffect(() => { refetch() }, [refetch])
  return { appointments, loading, refetch }
}

/** Appointments for a specific provider (for provider detail page). */
export function useAppointmentsForProvider(providerId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(false)

  const refetch = useCallback(async () => {
    if (!providerId) return
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', providerId)
      .order('appt_date', { ascending: false })
    setAppointments((data ?? []).map(cast))
    setLoading(false)
  }, [providerId])

  useEffect(() => { refetch() }, [refetch])
  return { appointments, loading, refetch }
}
