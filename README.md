# Gym ABC Tracker

Мобільний (browser-first) трекер гіпертрофії: тренування A/B/C (Пн/Ср/Пт), подвійна прогресія ваги/повторів, 13-тижневий цикл.

## Локально

```bash
npm install
cp .env.example .env   # опційно; без Turso — file:./data/workouts.db
npm run dev
# → http://localhost:3000
```

База: **файл** `./data/workouts.db` або **Turso** (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` у `.env`).

## Vercel + Turso (зал по LTE, Mac не потрібен)

Покрокова інструкція: **[docs/deploy-turso-vercel.md](docs/deploy-turso-vercel.md)**  
Build на Vercel: `npm run build:vercel`.

## Телефон у залі

### Локальна Wi‑Fi (Mac у тій же мережі)

```bash
npm run mobile:url
docker compose up --build -d
```

Відкрий URL з `.env` у браузері телефону. Додай на домашній екран (PWA).

### LTE / мобільний інternet (Mac вдома увімкнений)

**Vercel + база на Mac напряму не працює** — Vercel не бачить твій `workouts.db`. Безкоштовна альтернатива без VPS: **[Cloudflare Tunnel](docs/mobile-from-anywhere.md)**:

```bash
# .env: CLOUDFLARE_TUNNEL_TOKEN=...
docker compose --profile tunnel up --build -d
```

Відкривай **HTTPS URL з Cloudflare** на телефоні — повний додаток онлайн, база лишається на Mac.

Для залу без Mac зручніше **Vercel + Turso** (див. вище).

## Тести

```bash
npm test
```

## Маршрути

- **/** — наступне тренування, бейджі прогресії
- **/workout/[id]** — активна сесія, підходи, таймер
- **/history** — історія та графіки вправ
- **/program** — шаблон A/B/C, редагування
- **/settings** — цикл, таймер, експорт JSON/CSV
