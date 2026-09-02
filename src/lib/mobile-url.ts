export const getMobileUrl = (): string | null => {
  return process.env.MOBILE_URL ?? process.env.NEXT_PUBLIC_MOBILE_URL ?? null
}
