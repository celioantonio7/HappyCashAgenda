export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

export function businessNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}`, minutes: Number(value('hour')) * 60 + Number(value('minute')) };
}

export function businessClock(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {
    timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

export function timeMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function businessSlots(open: string, close: string, duration = 0, interval = 30) {
  const start = timeMinutes(open), end = timeMinutes(close);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || duration < 0 || interval <= 0) return [];
  const slots: string[] = [];
  for (let minute = start; minute < end && minute + duration <= end; minute += interval) {
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return slots;
}
