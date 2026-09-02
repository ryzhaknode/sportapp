'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Dumbbell, History, Home, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Головна', icon: Home },
  { href: '/workout', label: 'Тренування', icon: Dumbbell },
  { href: '/history', label: 'Прогрес', icon: History },
  { href: '/guide', label: 'Гід', icon: BookOpen },
  { href: '/settings', label: 'Налашт.', icon: Settings },
]

export const Nav = () => {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur-md">
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
