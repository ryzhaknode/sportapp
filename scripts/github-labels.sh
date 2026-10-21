#!/usr/bin/env bash
# Усі мітки конвеєра issues: Ingest → Triage → Refinement → людське затвердження → Prioritizer.
# Потрібно: gh auth login. --force оновлює колір і опис, якщо мітка вже є.
set -euo pipefail

REPO="${REPO:-ryzhaknode/sportapp}"

mk() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; echo "  + $1"; }

# джерела
mk "source:user"        "c5def5" "Повідомив користувач"
mk "source:dev"         "c5def5" "Повідомив розробник"
mk "source:auto"        "c5def5" "Автоматично (напр. Sentry)"
# тип і тріаж
mk "type:bug"           "d73a4a" "Помилка"
mk "type:feature"       "a2eeef" "Нова можливість"
mk "type:question"      "d876e3" "Питання"
mk "possible-duplicate" "cfd3d7" "Можливий дублікат"
mk "reproduced"         "0e8a16" "Баг відтворено"
mk "needs-info"         "d4c5f9" "Бракує інформації"
mk "triaged"            "bfd4f2" "Розсортовано агентом, чекає рішення людини"
# область коду
mk "area:workout"       "f9d0c4" "Сценарій тренування"
mk "area:progression"   "bfdadc" "Логіка прогресії"
mk "area:db"            "006b75" "База даних / Turso"
mk "area:ui"            "e99695" "UI / мобільний"
# людський контроль
mk "needs-refinement"   "fbca04" "👤 Людина: відправити на уточнення"
mk "awaiting-approval"  "f9d0c4" "Агент уточнив, чекає перевірки людини"
mk "approved"           "0e8a16" "👤 Людина: ТЗ затверджено"
mk "needs-split"        "e99695" "Задача завелика, треба ділити"
# черга (Prioritizer)
mk "ready-for-dev"      "1d76db" "Prioritizer: взято в роботу"
mk "in-progress"        "5319e7" "Агент або людина працює"
mk "pipeline:queue"     "000000" "Службове: дошка черги"
# оцінка
mk "P1"                 "b60205" "Терміново"
mk "P2"                 "d93f0b" "Важливо"
mk "P3"                 "fef2c0" "Коли буде час"
mk "size:S"             "c2e0c6" "Мала"
mk "size:M"             "bfdadc" "Середня"
mk "size:L"             "5319e7" "Велика"
mk "blast:low"          "0e8a16" "Низький ризик"
mk "blast:high"         "b60205" "Високий ризик"
echo "✓ Готово"
