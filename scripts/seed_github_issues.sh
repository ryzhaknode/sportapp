#!/usr/bin/env bash
# Створює мітки та 8 тестових issues для перевірки Triage Agent (dedup, needs-info).
# Потрібно: gh auth login, права на repo.

set -euo pipefail

REPO="${REPO:-ryzhaknode/sportapp}"

create_label() {
  local name="$1"
  local color="$2"
  local description="${3:-}"
  if gh label list --repo "$REPO" --search "$name" --json name --jq ".[] | select(.name==\"$name\")" | grep -q .; then
    echo "Label exists: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" || true
    echo "Created label: $name"
  fi
}

echo "==> Labels"
create_label "source:user" "1D76DB" "Report from user form"
create_label "source:dev" "5319E7" "Report from dev form"
create_label "source:auto" "0E8A16" "Auto-reported (e.g. Sentry)"
create_label "type:bug" "D73A4A" "Bug"
create_label "type:feature" "A2EEEF" "Feature request"
create_label "type:question" "D4C5F9" "Question"
create_label "possible-duplicate" "FBCA04" "Possible duplicate"
create_label "reproduced" "0E8A16" "Likely reproduced in code/tests"
create_label "needs-info" "B60205" "Missing reproduction info"
create_label "needs-refinement" "C5DEF5" "Ready for Refinement Agent"
create_label "area:workout" "F9D0C4" "Workout flow"
create_label "area:progression" "BFDADC" "Progression logic"
create_label "area:db" "006B75" "Database / Turso"
create_label "area:ui" "E99695" "UI / mobile"

echo "==> Test issues"

# 1 — baseline bug (Ukrainian, decimal weight on iOS)
gh issue create --repo "$REPO" \
  --title "На iPhone не вводиться вага 74.2 кг перед тренуванням" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### Що сталося?
Після крапки зникає десяткова частина.

### Кроки відтворення
1. Відкрити weigh-in на iPhone Safari
2. Ввести 74.2 у поле ваги
3. Поле показує 74 без .2

### Що очікувалось?
Має зберегтися 74.2

### Середовище
iPhone / Safari / Vercel prod
EOF
)"

# 2 — duplicate of #1 theme (should get possible-duplicate)
gh issue create --repo "$REPO" \
  --title "Decimal body weight broken on mobile" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### What happened
Cannot enter 74.2 kg on weigh-in form.

### Steps
1. Open app on iPhone
2. Start workout weigh-in
3. Type 74.2 — only 74 stays

### Expected
74.2 should work
EOF
)"

# 3 — another Ukrainian duplicate (timer)
gh issue create --repo "$REPO" \
  --title "Таймер відпочинку не показує час після згортання Safari" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### Що сталося?
Після повернення в таб таймер стоїть на 0.

### Кроки відтворення
1. Почати тренування A
2. Завершити підхід, дочекатися rest timer
3. Згорнути Safari на 30 сек
4. Повернутися — таймер 0:00

### Що очікувалось?
Таймер має показувати залишок
EOF
)"

# 4 — duplicate timer (English)
gh issue create --repo "$REPO" \
  --title "Rest timer resets when switching apps on iOS" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### Steps
1. Complete a set
2. Background Safari
3. Reopen — rest timer shows 0

Same as other timer issue.
EOF
)"

# 5 — useless report (needs-info)
gh issue create --repo "$REPO" \
  --title "щось зламалось" \
  --label "source:user" \
  --body "не працює"

# 6 — feature request
gh issue create --repo "$REPO" \
  --title "Експорт тренувань у Apple Health" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### Коротко
Синхронізувати завершені тренування з Apple Health.

### Навіщо
Бачити активність разом з кроками та сном.
EOF
)"

# 7 — dev bug (progression)
gh issue create --repo "$REPO" \
  --title "[dev] Progression stall не скидається після deload week" \
  --label "source:dev" \
  --body "$(cat <<'EOF'
### Що сталося?
Після тижня 7 deload stallCount лишається 2.

### Кроки відтворення
1. Два тренування з застоєм на жимі
2. Пройти deload week 7
3. На week 8 все ще decrease_weight hint

### Середовище
local + Turso staging
EOF
)"

# 8 — question / vague db
gh issue create --repo "$REPO" \
  --title "Куди зникли мої тренування?" \
  --label "source:user" \
  --body "$(cat <<'EOF'
### Що сталося?
В історії порожньо після оновлення.

### Кроки відтворення
1. Відкрити /history
2. Нічого немає

### Середовище
Vercel, можливо інший телефон
EOF
)"

echo "==> Done. Check Issues and Actions tab for Triage runs."
