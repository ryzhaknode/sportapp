import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageMainProps {
  children: ReactNode
  className?: string
}

/** Стандартний контейнер табів (без подвійного pb — відступ з layout). */
export const PageMain = ({ children, className }: PageMainProps) => (
  <main className={cn('app-page flex flex-col gap-6', className)}>{children}</main>
)
