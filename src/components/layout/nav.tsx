'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, History, Home, Scale, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Головна', icon: Home },
  { href: '/history', label: 'Історія', icon: History },
  { href: '/weight', label: 'Вага', icon: Scale },
  { href: '/program', label: 'Програма', icon: BookOpen },
  { href: '/settings', label: 'Налашт.', icon: Settings },
]

export const Nav = () => {
  const pathname = usePathname()
  const hide =
    pathname.startsWith('/workout/') &&
    !pathname.endsWith('/summary') &&
    !pathname.startsWith('/workout/weigh-in')

  if (hide) return null

  return (
    <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] transition-colors sm:text-xs',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active && 'text-amber-400')} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
