'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowUpCircle,
  CalendarClock,
  Gauge,
  Moon,
  Settings,
  TrendingUp,
  CalendarDays,
} from 'lucide-react'
import { GuideCycleVisual } from '@/components/guide/guide-cycle-visual'
import { GuideSection } from '@/components/guide/guide-section'
import { GuideWorkoutCard } from '@/components/guide/guide-workout-card'
import {
  DELOAD_SIGNS,
  CALENDAR_GUIDE,
  MAX_TEST_GUIDE,
  PROGRESSION_STEPS,
  RIR_TABLE,
  WORKOUT_GUIDE,
} from '@/lib/program-guide'

export default function GuidePage() {
  return (
    <main className="flex min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Як це працює</p>
        <h1 className="text-2xl font-bold">Програма тренувань</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Віджимання через день: три типи сесій, поступова прогресія без ваги.
          Головне — якісний обсяг, а не щоденний максимум.
        </p>
      </header>

      <GuideSection title="Цикл через день" icon={CalendarClock} index={0}>
        <GuideCycleVisual />
      </GuideSection>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Типи тренувань
        </h2>
        {WORKOUT_GUIDE.map((workout, index) => (
          <GuideWorkoutCard key={workout.type} {...workout} index={index} />
        ))}
      </div>

      <GuideSection title="RIR — запас до відмови" icon={Gauge} index={1}>
        <p className="mb-4 text-sm text-muted-foreground">
          RIR (Reps In Reserve) — скільки повторень залишилось «в баку». При max ~20 reps
          орієнтуйся так:
        </p>
        <ul className="flex flex-col gap-2">
          {RIR_TABLE.map((row) => (
            <li
              key={row.reps}
              className="flex items-center justify-between rounded-xl bg-secondary px-4 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{row.reps} reps</span>
              <span className="font-medium">RIR {row.rir}</span>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection title="Як прогресувати" icon={TrendingUp} iconClassName="text-emerald-400" index={2}>
        <ol className="flex flex-col gap-4">
          {PROGRESSION_STEPS.map((step, stepIndex) => (
            <li key={step.id} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                {stepIndex + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection title="Коли робити max test" icon={Activity} iconClassName="text-amber-400" index={3}>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">
              Раз на {MAX_TEST_GUIDE.interval}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{MAX_TEST_GUIDE.purpose}</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>{MAX_TEST_GUIDE.afterTest}</li>
            <li>{MAX_TEST_GUIDE.where}</li>
          </ul>
          <Link
            href="/settings"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-transparent px-5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Записати max test
          </Link>
        </div>
      </GuideSection>

      <GuideSection title="Deload — коли полегшити" icon={Moon} index={4}>
        <p className="mb-3 text-sm text-muted-foreground">
          Якщо помічаєш ознаки перетренованості — зроби легший тиждень (напр. 3×12, RIR ~4).
          У додатку: Deload на сторінці тренування.
        </p>
        <ul className="flex flex-col gap-2">
          {DELOAD_SIGNS.map((sign) => (
            <li
              key={sign}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              {sign}
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection title="Ускладнення вправи" icon={ArrowUpCircle} iconClassName="text-blue-400" index={5}>
        <p className="text-sm text-muted-foreground">
          Довгостроковий шлях: звичайні віджимання → ноги на підвищенні → deficit push-ups.
          Змінюй варіант у{' '}
          <Link href="/settings" className="font-medium text-foreground underline-offset-4 hover:underline">
            Налаштуваннях
          </Link>{' '}
          і починай новий цикл з нижчих reps.
        </p>
      </GuideSection>

      <GuideSection title="Календар і skip rest" icon={CalendarDays} iconClassName="text-emerald-400" index={6}>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>{CALENDAR_GUIDE.completed}</li>
          <li>{CALENDAR_GUIDE.rest}</li>
          <li>{CALENDAR_GUIDE.skipped}</li>
          <li>{CALENDAR_GUIDE.pending}</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">{CALENDAR_GUIDE.skipRest}</p>
      </GuideSection>

      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <Settings className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium">Дата старту циклу</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Задай у Налаштуваннях — від неї рахується A / B / C кожного дня.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-secondary px-5 text-sm font-medium transition-colors hover:bg-secondary/80"
        >
          Відкрити налаштування
        </Link>
      </div>
    </main>
  )
}
