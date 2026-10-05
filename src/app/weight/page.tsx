import Link from 'next/link'
import { AddWeightForm } from '@/components/weight/add-weight-form'
import { BodyWeightChart } from '@/components/weight/body-weight-chart'
import { PageMain } from '@/components/layout/page-main'
import { getBodyWeightEntries, getBodyWeightHistory, getLatestBodyWeight } from '@/lib/db/body-weight'

export const dynamic = 'force-dynamic'

export default async function WeightPage() {
  const chartData = await getBodyWeightHistory()
  const entries = await getBodyWeightEntries(40)
  const latest = await getLatestBodyWeight()

  return (
    <PageMain className="gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.625rem] font-bold leading-tight tracking-tight">Вага тіла</h1>
        <p className="text-sm leading-snug text-muted-foreground">
          {latest != null
            ? `Останній запис: ${latest} кг`
            : 'Перед кожним тренуванням зважуйся — запис зʼявиться тут.'}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {chartData.length > 0 ? (
          <BodyWeightChart data={chartData} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-5 text-center text-sm leading-relaxed text-muted-foreground">
            Ще немає даних. Почни тренування з головної — спочатку введеш вагу.
          </div>
        )}

        <AddWeightForm />
      </section>

      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold leading-tight">Журнал</h2>
          <ul className="flex flex-col gap-2">
            {entries.map((e) => {
              const dateLabel = new Date(`${e.date}T12:00:00`).toLocaleDateString('uk-UA', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.sessionId ? 'Перед тренуванням' : 'Ручний запис'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-lg font-semibold tabular-nums">{e.weightKg} кг</span>
                    {e.sessionId && (
                      <Link
                        href={`/workout/${e.sessionId}/summary`}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        A/B/C
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </PageMain>
  )
}
