# Turso + Vercel — покроково

База в хмарі (безкоштовний tier Turso), фронт і API на Vercel. **Mac у залі не потрібен** для онлайн-тренувань. Офлайн PWA + sync лишаються як запасний варіант.

---

## 1. Turso CLI

```bash
# macOS
brew install tursodatabase/tap/turso
turso auth login
```

Або: https://docs.turso.tech/cli/installation

---

## 2. Створити базу

```bash
turso db create sportapp-gym
```

Ім’я може бути іншим; нижче підстав своє.

### URL і токен

```bash
turso db show sportapp-gym --url
# → libsql://sportapp-gym-xxxxx.turso.io

turso db tokens create sportapp-gym
# → eyJhbG...  (збережи, показують один раз)
```

### Локальний `.env`

```bash
cp .env.example .env
```

```env
TURSO_DATABASE_URL=libsql://sportapp-gym-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbG...
MOBILE_URL=https://ТВІЙ-ПРОЄКТ.vercel.app
NEXT_PUBLIC_MOBILE_URL=https://ТВІЙ-ПРОЄКТ.vercel.app
```

`DATABASE_URL` **не потрібен**, якщо задано `TURSO_*`.

---

## 3. Міграції на Turso

З кореня проєкту (з `.env`):

```bash
npm install
npm run db:migrate
```

Перевірка в консолі Turso:

```bash
turso db shell sportapp-gym
```

```sql
.tables
SELECT * FROM settings;
.quit
```

Після першого відкриття сайту спрацює seed програми A/B/C (`ensureProgramSeeded`).

---

## 4. Перенести дані з Mac (`workouts.db`)

Якщо база вже була локально:

```bash
sqlite3 data/workouts.db .dump > /tmp/sportapp-dump.sql
turso db shell sportapp-gym < /tmp/sportapp-dump.sql
```

Якщо dump лається на `BEGIN`/`COMMIT` — імпортуй лише `INSERT` або створіть чисту Turso і почни з нуля.

---

## 5. Vercel

1. https://vercel.com → **Import** Git-репозиторій `sportapp`.
2. **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|--------|
   | `TURSO_DATABASE_URL` | `libsql://...` |
   | `TURSO_AUTH_TOKEN` | `eyJ...` |
   | `MOBILE_URL` | `https://xxx.vercel.app` |
   | `NEXT_PUBLIC_MOBILE_URL` | те саме |

3. **Build Command** (Settings → General):

   ```bash
   npm run build:vercel
   ```

   (міграції + `next build`)

4. Deploy.

5. На телефоні відкрий **HTTPS URL Vercel** → PWA на домашній екран.

---

## 6. Як працює код

- `src/lib/db/index.ts`: якщо є `TURSO_DATABASE_URL` → `@libsql/client` у хмару; інакше `file:./data/workouts.db` (Docker / dev).
- На **Vercel** авто-migrate при запиті вимкнено; схема оновлюється в **build**.
- Локально / Docker: migrate при старті (як раніше).

---

## 7. Turso Dashboard (веб)

1. https://turso.tech/app  
2. **Databases** → твоя БД → metrics, replicas.  
3. **SQL console** — ті самі запити, що в `turso db shell`.

---

## 8. Ліміти free tier (орієнтовно)

- Кілька GB storage, мільйони read rows — для одного атлета більш ніж достатньо.  
- Актуальні ліміти: https://turso.tech/pricing

---

## 9. Docker на Mac (опційно)

Можна лишити Docker, але в `docker-compose` / `.env` додати ті самі `TURSO_*` — тоді і Mac, і Vercel дивляться в **одну** базу.

```yaml
environment:
  TURSO_DATABASE_URL: ${TURSO_DATABASE_URL}
  TURSO_AUTH_TOKEN: ${TURSO_AUTH_TOKEN}
```

Volume `./data` тоді не обов’язковий для даних тренувань.

---

## Troubleshooting

| Проблема | Що зробити |
|----------|------------|
| `401` / auth | Новий token: `turso db tokens create sportapp-gym` |
| Порожня програма | Відкрий `/` один раз онлайн або `npm run db:migrate` |
| Build на Vercel падає на migrate | Перевір env vars на build; `turso db show` |
| Локально file, Vercel turso | Різні бази — це норм; для однієї бази всюди використовуй Turso |
