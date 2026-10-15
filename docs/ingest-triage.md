# Ingest: GitHub Issues + Triage Agent

Одна «вхідна скринька» для фідбеку по **sportapp** і автоматичне сортування через GitHub Actions (Claude Code Triage Agent).

## Що в репозиторії

| Шлях | Призначення |
|------|-------------|
| [.github/workflows/triage.yml](../.github/workflows/triage.yml) | Запуск на `issues.opened`, read-only triage |
| [.github/ISSUE_TEMPLATE/](../.github/ISSUE_TEMPLATE/) | Форми: баг (user/dev), ідея |
| [scripts/seed_github_issues.sh](../scripts/seed_github_issues.sh) | Мітки + 8 тестових issues |

## Одноразове налаштування GitHub

1. **API ключ / Claude GitHub App**
   - У терміналі: `claude` → `/install-github-app`, **або**
   - Встановити [Claude GitHub App](https://github.com/apps/claude) на `ryzhaknode/sportapp`
   - Додати секрет **`ANTHROPIC_API_KEY`** у **Settings → Secrets and variables → Actions**

2. **GitHub CLI** (для seed): `gh auth login`

3. Публічний репо: triage спрацьовує лише для issues від **OWNER / MEMBER / COLLABORATOR** (захист від спаму та prompt injection).

## Перевірка після push

```bash
bash scripts/seed_github_issues.sh
```

Відкрий **Issues** і **Actions → Triage Agent**. Очікування:

- дублікати (вага 74.2, таймер) → `possible-duplicate` + коментар з посиланням;
- «щось зламалось» → `needs-info`;
- нормальні баги → `area:*`, `reproduced` або `needs-info`, **`needs-refinement`**;
- workflow **не** створює PR і не комітить код.

## Мітки

- **Джерело:** `source:user`, `source:dev` (майбутнє: `source:auto` для Sentry)
- **Тип (triage):** `type:bug`, `type:feature`, `type:question`
- **Triage:** `possible-duplicate`, `reproduced`, `needs-info`, `needs-refinement`
- **Область:** `area:workout`, `area:progression`, `area:db`, `area:ui`

`needs-refinement` — вхід для наступного етапу (Refinement Agent).

## Повідомити про баг (користувачам)

[Створити issue → шаблон «Баг»](https://github.com/ryzhaknode/sportapp/issues/new/choose)

## Наступні етапи (не в цьому PR)

- Sentry на Vercel → issues з `source:auto`
- Refinement Agent (workflow на `needs-refinement`)
