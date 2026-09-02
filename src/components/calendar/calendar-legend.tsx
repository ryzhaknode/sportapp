import { DAY_STATUS_LABELS } from '@/lib/calendar-status'
import type { DayStatus } from '@/lib/calendar-status'

const LEGEND_ITEMS: { status: DayStatus; color: string }[] = [
  { status: 'completed', color: 'bg-emerald-500' },
  { status: 'rest', color: 'bg-zinc-600' },
  { status: 'skipped', color: 'bg-red-500' },
  { status: 'pending', color: 'bg-amber-500 ring-2 ring-amber-500/50' },
]

export const CalendarLegend = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-2">
    {LEGEND_ITEMS.map(({ status, color }) => (
      <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
        {DAY_STATUS_LABELS[status]}
      </div>
    ))}
  </div>
)
