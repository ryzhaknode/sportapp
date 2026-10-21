@AGENTS.md

# sportapp — Gym ABC Tracker

Мобільний (browser-first, PWA) трекер гіпертрофії для одного користувача. Інтерфейс і всі тексти — **українською**.

## Стек
- Next.js 16 (App Router, Server Actions), React 19, Tailwind 4.
- Drizzle ORM + libSQL: прод — Turso на Vercel (`TURSO_DATABASE_URL`), локально — файл `data/workouts.db` (`DATABASE_URL`).
- Тести — Vitest (`*.test.ts` поруч з кодом, лише чиста логіка без БД).

## Структура
- `src/app/` — маршрути: `/` (наступне тренування), `workout/[sessionId]` (+ `summary`), `workout/weigh-in/[code]`, `history`, `program`, `weight`, `settings`, `guide`.
- `src/app/actions/` — Server Actions; кожна мутація даних проходить тут і викликає `revalidatePath`.
- `src/components/<розділ>/` — клієнтські компоненти (`workout`, `home`, `history`, `weight`, `program`, `settings`, `ui`).
- `src/lib/db/` — схема, підключення, доступ до даних (`workout-sessions.ts` — серце застосунку).
- `src/lib/progression/` — подвійна прогресія (вага/повтори), застій, e1RM.
- `src/lib/program/` — розклад A/B/C і 13-тижневий цикл.
- `drizzle/` — SQL-міграції; `scripts/` — сиди й службові скрипти; `telegram-ingest/` — бот, що створює issues.

## Предметні правила
- Тренування A/B/C у Пн/Ср/Пт; одне завершене тренування кожного коду на день.
- Цикл 13 тижнів: 7 — розвантаження, 13 — тест (1 підхід), 8–12 — +1 підхід для деяких вправ.
- Прогресію рахує лише історія `normal`-сесій (`countsTowardProgression`); застій 2 рази поспіль → зниження ваги.
- `progression_state` — лише кеш; джерело правди — завершені сесії (`evaluateProgressionHistory`).

## Критичні модулі (зміни тут = високий ризик)
`src/lib/db/schema.ts` + `drizzle/`, `src/lib/db/index.ts`, `src/lib/db/workout-sessions.ts`,
`src/lib/progression/*`, `src/lib/program/week-cycle.ts`, `src/lib/program/schedule.ts`,
`src/app/actions/*`, `next.config.ts`, `vercel.json`, `.github/workflows/`, `telegram-ingest/`.

## Команди
```bash
npm test            # Vitest
npm run lint        # ESLint (має бути без помилок)
npx tsc --noEmit    # типи
npm run dev         # локально на file:./data/workouts.db (або Turso з .env)
```

## Конвеєр issues
Triage → 👤 `needs-refinement` → Refinement → 👤 `approved` → Prioritizer (без AI) → `ready-for-dev`.
Агенти не змінюють код і ніколи не ставлять мітки людського контролю. Кожен агент перевіряє kill switch
`vars.PIPELINE_ENABLED != 'false'` у `if:`. Деталі: `docs/refinement-pipeline.md`, рубрика — `.github/agents/refinement-rubric.md`.
