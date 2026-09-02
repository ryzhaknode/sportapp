import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
