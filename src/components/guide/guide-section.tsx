'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GuideSectionProps {
  title: string
  icon: LucideIcon
  iconClassName?: string
  children: React.ReactNode
  index?: number
}

export const GuideSection = ({
  title,
  icon: Icon,
  iconClassName,
  children,
  index = 0,
}: GuideSectionProps) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
  >
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg bg-secondary',
              iconClassName,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  </motion.section>
)
