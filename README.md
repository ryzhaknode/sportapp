# Push-up Tracker

Персональний трекер прогресу віджимань за стратегією A/B/C через день.

## Локально (Docker)

```bash
docker compose up --build
# → http://localhost:3000
```

Дані: `./data/workouts.db`

## Локальна розробка

```bash
npm install
npm run dev
```

## Мобільний доступ (Wi‑Fi)

```bash
npm run mobile:url
docker compose up --build -d
```

Відкрий URL з `.env` на телефоні в тій самій мережі.

## Деплой в інтернет (без Docker / Wi‑Fi)

**Vercel + SQLite напряму не підходить** — файлова БД на serverless не зберігається між запитами.

| Платформа | Підходить? | Чому |
|-----------|------------|------|
| **Railway / Render / Fly.io** | Так | Docker + persistent volume або Node + диск |
| **Vercel + Turso** | Так | Cloud SQLite (потрібна міграція БД) |
| **Vercel як зараз** | Ні | `better-sqlite3` + `./data/` не персистить |

### Рекомендація: Railway (найпростіше)

1. Push репозиторій на GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Додай **Volume** mount на `/app/data`
4. Env: `DATABASE_URL=file:/app/data/workouts.db`
5. Отримаєш URL типу `https://sportapp-production.up.railway.app` — працює з телефону через інтернет

### Альтернатива: Vercel + Turso

Потрібна заміна `better-sqlite3` на `@libsql/client` + Turso DB (безкоштовний tier). Це окремий крок міграції.

## Перший запуск

1. **Налаштування** — дата старту циклу
2. **Головна** — сьогоднішній тип A / B / C / rest
3. **Тренування** — reps, таймер, skip rest
4. **Гід** — як влаштована програма

## Цикл

```
A → Rest → B → Rest → C → Rest → A → ...
```

Головна метрика — **total reps**.

## Резервна копія

**Налаштування → Експорт JSON**
