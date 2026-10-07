/** Keeps partial decimals while typing (e.g. "74.") — avoids iOS number input quirks. */
export const sanitizeDecimalKgInput = (raw: string): string => {
  let value = raw.replace(',', '.')
  value = value.replace(/[^\d.]/g, '')
  const dotIndex = value.indexOf('.')
  if (dotIndex === -1) return value
  const before = value.slice(0, dotIndex + 1)
  const after = value.slice(dotIndex + 1).replace(/\./g, '')
  return before + after
}

export const parseDecimalKg = (raw: string): number | null => {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed || trimmed === '.') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export const formatDecimalKg = (kg: number): string => {
  if (!Number.isFinite(kg)) return ''
  const rounded = +kg.toFixed(2)
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
