type DailyAppointment = { id: string; status: string; appointment_date: string; appointment_time: string; appointment_type?: string; created_at?: string };
export function dailyAppointments<T extends DailyAppointment>(items: T[], today: string, view: 'queue' | 'appointments') {
  return items.filter(item => item.status === 'scheduled' && item.appointment_date === today &&
    (view === 'queue' ? item.appointment_type === 'queue' : item.appointment_type !== 'queue'))
    .sort((a, b) => view === 'queue'
      ? (Date.parse(a.created_at || '') || 0) - (Date.parse(b.created_at || '') || 0) || a.id.localeCompare(b.id)
      : a.appointment_time.localeCompare(b.appointment_time) || a.id.localeCompare(b.id));
}
