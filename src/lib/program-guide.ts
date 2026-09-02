import type { WorkoutType } from '@/lib/cycle'
import { WORKOUT_TEMPLATES } from '@/lib/workouts'
import { formatDuration } from '@/lib/utils'

export interface GuideStep {
  id: string
  title: string
  body: string
}

export const CYCLE_STEPS = [
  { key: 'A', label: 'A', color: 'bg-amber-500' },
  { key: 'rest', label: '·', color: 'bg-zinc-600' },
  { key: 'B', label: 'B', color: 'bg-blue-500' },
  { key: 'rest2', label: '·', color: 'bg-zinc-600' },
  { key: 'C', label: 'C', color: 'bg-emerald-500' },
  { key: 'rest3', label: '·', color: 'bg-zinc-600' },
] as const

export const WORKOUT_GUIDE = (['A', 'B', 'C'] as const).map((type) => {
  const t = WORKOUT_TEMPLATES[type]
  return {
    type,
    label: t.label,
    description: t.description,
    sets: t.sets,
    repRange: t.repRange,
    rir: t.rir,
    rest: formatDuration(t.restSeconds),
    starter: t.defaultReps.join(' / '),
    starterTotal: t.defaultReps.reduce((a, b) => a + b, 0),
  }
})

export const PROGRESSION_STEPS: GuideStep[] = [
  {
    id: 'volume',
    title: '1. Збирай обсяг',
    body: 'Не гонись за максимумом у кожному підході. Тримай RIR 1–3 і поступово додавай повторення.',
  },
  {
    id: 'total',
    title: '2. Головна метрика — total reps',
    body: 'Порівнюй лише A з A, B з B, C з C. Приріст +1–3 reps за сесію — це реальний прогрес.',
  },
  {
    id: 'cap',
    title: '3. Досяг верхньої межі → ускладнюй',
    body: 'Наприклад 4×16 на A. Не додавай нескінченно reps — зміни варіант вправи в налаштуваннях.',
  },
  {
    id: 'reset',
    title: '4. Новий цикл з нижчих reps',
    body: 'Після ускладнення знову накопичуй обсяг у новому діапазоні.',
  },
]

export const MAX_TEST_GUIDE = {
  interval: '6–8 тижнів',
  purpose: 'Перевірити, чи зросла база сили. Не треба щотижня.',
  afterTest: 'Новий max — орієнтир для наступного циклу, не робоча вага щодня.',
  where: 'Запиши результат у Налаштування → Тест максимуму.',
}

export const DELOAD_SIGNS = [
  'Сила або reps падають кілька тренувань поспіль',
  'Болять плечі чи лікті',
  'RIR 3 відчувається як RIR 1',
  'Втома ще до тренування',
]

export const CALENDAR_GUIDE = {
  completed: 'Зелений — тренування виконано',
  rest: 'Сірий — запланований відпочинок',
  skipped: 'Червоний — пропущене тренування',
  pending: 'Жовтий контур — сьогоднішнє тренування ще не виконано',
  skipRest:
    'На rest day можна натиснути «Пропустити відпочинок» — цикл A/B/C зміститься на 1 день вперед.',
}

export const RIR_TABLE: { reps: string; rir: string }[] = [
  { reps: '~10', rir: '4–5' },
  { reps: '~12', rir: '3–4' },
  { reps: '~14', rir: '2–3' },
  { reps: '~16', rir: '1–2' },
  { reps: '~18', rir: '~1' },
  { reps: '~20', rir: '0 (max)' },
]

export const getWorkoutAccent = (type: WorkoutType): string => {
  const map: Record<WorkoutType, string> = {
    A: 'border-amber-500/30',
    B: 'border-blue-500/30',
    C: 'border-emerald-500/30',
  }
  return map[type]
}

export const getWorkoutDot = (type: WorkoutType): string => {
  const map: Record<WorkoutType, string> = {
    A: 'bg-amber-500',
    B: 'bg-blue-500',
    C: 'bg-emerald-500',
  }
  return map[type]
}
