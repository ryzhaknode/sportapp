# Телефон з будь-якого інternetу (без платного VPS)

## Vercel + SQLite на Mac — чому «просто так» не працює

Цей проєкт — **Next.js з Server Actions і SQLite (`better-sqlite3`) на тому ж сервері**, де крутиться UI.

| Ідея | Реальність |
|------|------------|
| Фронт на Vercel, база — файл на Mac | **Ні.** Vercel виконує код у своїх дата-центрах і **не бачить** `workouts.db` на MacBook. |
| Vercel «підключається» до SQLite по Wi‑Fi | **Ні.** Потрібен окремий **API-сервер на Mac** (REST) + рефакторинг усіх actions — це великий проєкт. |
| Mac як «база», Vercel як «фронт» | Можливо лише після **розділення** app → API (Mac) + SPA/Next client-only (Vercel). Зараз архітектура інша. |

**Висновок:** дешевший і швидший шлях — не Vercel, а **HTTPS-доступ до Mac**, коли він увімкнений вдома.

---

## Рекомендація: Cloudflare Tunnel (безкоштовно)

Один постійний URL типу `https://gym-abc.твоє-ім’я.trycloudflare.com` або власний домен на Cloudflare.

- Телефон у залі на **LTE** відкриває **той самий** додаток, що й вдома.
- База лишається в `./data/workouts.db` на Mac.
- Платний VPS не потрібен.
- Mac має бути **увімкнений**, Docker **запущений**, інternet на Mac — **є**.

### Крок 1 — Cloudflare Zero Trust

1. Акаунт на [Cloudflare](https://dash.cloudflare.com/) (безкоштовно).
2. **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**.
3. Ім’я, напр. `sportapp-mac`.
4. Обери **Docker**, скопіюй **token** (`eyJ...`).

### Крок 2 — `.env` на Mac

```bash
CLOUDFLARE_TUNNEL_TOKEN=eyJ...твій_токен...
```

У налаштуваннях тунелю в Cloudflare вкажи **Public Hostname**:

- **Service type:** HTTP  
- **URL:** `app:3000` (якщо tunnel у тому ж `docker compose`) **або** `host.docker.internal:3000` / `192.168.x.x:3000` залежно від схеми.

У нашому `docker-compose` сервіс tunnel дивиться на **`http://app:3000`**.

### Крок 3 — Запуск

```bash
npm run mobile:url          # LAN URL для QR вдома (опційно)
docker compose --profile tunnel up --build -d
```

У Cloudflare задай hostname (напр. `gym.example.com` або безкоштовний subdomain).

### Крок 4 — Телефон

1. Відкрий **HTTPS URL з тунелю** (не `192.168...`).
2. **Налаштування → Можеш оновити `MOBILE_URL`** на цей HTTPS URL (для QR), або просто збережи закладку / PWA.
3. Додай на домашній екран — PWA працює з **HTTPS**, стабільніше ніж `http://192.168...`.

---

## Коли Mac вимкнений або без інternetу

- **Онлайн-тренування** — недоступні (немає сервера).
- **Офлайн-режим залу** (`/offline`, service worker) — як запасний варіант: тренування на телефоні, **sync вдомa**, коли Mac знову online.

---

## Альтернатива: хмарна БД (Turso / Neon free tier)

Якщо хочеш **справжній deploy на Vercel без Mac у залі**:

- Перенести SQLite → **Turso** (libSQL) або Postgres (Neon).
- Тоді весь Next.js може жити на Vercel, Mac не потрібен для онлайн-сесій.
- Це **міграція БД + зміна `getDb()`**, не «тільки фронт».

Turso має безкоштовний tier — це не «купити сервер», але дані будуть не тільки на Mac.

---

## Швидке порівняння

| Варіант | LTE у залі (онлайн) | Mac вдома | Складність |
|---------|---------------------|-----------|------------|
| Wi‑Fi `192.168.x.x` | Лише та сама Wi‑Fi | Так | Вже є |
| PWA офлайн `/offline` | Так, без Mac | Sync вдoma | Вже є |
| **Cloudflare Tunnel** | **Так** | Так (Docker) | ~15 хв налаштування |
| Vercel + Mac SQLite | Ні без API | — | Великий рефакторинг |
| Vercel + Turso | Так | Ні для онлайн | Середня міграція |
