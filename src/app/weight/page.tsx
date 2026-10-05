import Link from 'next/link'
import { AddWeightForm } from '@/components/weight/add-weight-form'
import { BodyWeightChart } from '@/components/weight/body-weight-chart'
import { getBodyWeightEntries, getBodyWeightHistory, getLatestBodyWeight } from '@/lib/db/body-weight'

export const dynamic = 'force-dynamic'

export default async function WeightPage() {
  const chartData = await getBodyWeightHistory()
  const entries = await getBodyWeightEntries(40)
  const latest = await getLatestBodyWeight()

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold">Вага тіла</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {latest != null
            ? `Останній запис: ${latest} кг`
            : 'Перед кожним тренуванням зважуйся — запис зʼявиться тут.'}
        </p>
      </header>

      {chartData.length > 0 ? (
        <BodyWeightChart data={chartData} />
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Ще немає даних. Почни тренування з головної — спочатку введеш вагу.
        </div>
      )}

      <AddWeightForm />

      {entries.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Журнал</h2>
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
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.sessionId ? 'Перед тренуванням' : 'Ручний запис'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
    </main>
  )
}
