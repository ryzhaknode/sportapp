import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The user's timezone. The server (Vercel) runs in UTC, so "today" and clock
 * times must be computed here explicitly, not from the process timezone.
 */
export const APP_TZ = 'Europe/Kyiv'

const appDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar date (YYYY-MM-DD) of an instant in APP_TZ. */
export const formatDateInAppTz = (date: Date): string => {
  const parts = Object.fromEntries(
    appDateFormat.formatToParts(date).map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const todayInAppTz = (): string => formatDateInAppTz(new Date())

/** Clock time (HH:mm) of an ISO instant in APP_TZ. */
export const formatTimeInAppTz = (iso: string): string =>
  new Date(iso).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TZ,
  })

export const parseLocalDate = (dateStr: string): Date => new Date(`${dateStr}T12:00:00`)

export const diffDays = (from: string, to: string): number => {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export const formatDisplayDate = (dateStr: string): string => {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export const formatShortDate = (dateStr: string): string => {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
  })
}

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
