'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, History, Home, Scale, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Головна', icon: Home, ariaLabel: 'Головна' },
  { href: '/history', label: 'Історія', icon: History, ariaLabel: 'Історія тренувань' },
  { href: '/weight', label: 'Вага', icon: Scale, ariaLabel: 'Вага тіла' },
  { href: '/program', label: 'План', icon: BookOpen, ariaLabel: 'Програма A/B/C' },
  { href: '/settings', label: 'Налаш.', icon: Settings, ariaLabel: 'Налаштування' },
] as const

export const Nav = () => {
  const pathname = usePathname()
  const hide =
    pathname.startsWith('/workout/') &&
    !pathname.endsWith('/summary') &&
    !pathname.startsWith('/workout/weigh-in')

  if (hide) return null

  return (
    <nav
      className="app-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md"
      aria-label="Головна навігація"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-0.5 pt-1">
        {links.map(({ href, label, icon: Icon, ariaLabel }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-label={ariaLabel}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] font-medium leading-none transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground active:text-foreground',
              )}
            >
              <Icon className={cn('h-[22px] w-[22px] shrink-0', active && 'text-amber-400')} aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
