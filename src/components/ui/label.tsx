import { cn } from '@/lib/utils'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export const Label = ({ className, ...props }: LabelProps) => (
  <label
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
)
