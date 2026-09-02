import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary'
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
      variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
      variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
      variant === 'outline' && 'text-foreground',
      className,
    )}
    {...props}
  />
)
