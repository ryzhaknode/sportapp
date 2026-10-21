/**
 * Prioritizer: детермінований скрипт (без AI).
 * 1. Збирає затверджені задачі (мітка `approved`).
 * 2. Сортує: пріоритет → розмір → вік.
 * 3. Заповнює вільні місця в роботі (WIP_LIMIT) міткою `ready-for-dev`.
 * 4. Оновлює закріплене issue «📋 Черга» — це і є дошка з кольоровими блоками.
 *
 * Запускається через actions/github-script, тому отримує готові github/context/core.
 */
const PRIORITY = { P1: 1, P2: 2, P3: 3 };
const SIZE = { "size:S": 1, "size:M": 2, "size:L": 3 };
const IN_WORK = ["ready-for-dev", "in-progress"];
const QUEUE_LABEL = "pipeline:queue";

const labelSet = (issue) =>
  new Set(issue.labels.map((l) => (typeof l === "string" ? l : l.name)));

const pick = (set, map, fallback) => Object.keys(map).find((k) => set.has(k)) ?? fallback;

const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

function row(pos, issue) {
  const s = labelSet(issue);
  const blast = s.has("blast:high") ? "🔴 high" : s.has("blast:low") ? "🟢 low" : "—";
  // `|` ламає таблицю; `@` пінгував би людей при кожному оновленні дошки.
  const title = issue.title.replace(/\|/g, "\\|").replace(/@/g, "@\u200b").slice(0, 60);
  return `| ${pos} | #${issue.number} | ${title} | ${pick(s, PRIORITY, "—")} | ${pick(s, SIZE, "—").replace("size:", "")} | ${blast} | ${ageDays(issue.created_at)} дн |`;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const enabled = (process.env.PIPELINE_ENABLED || "true") !== "false";
  const autoPromote = (process.env.AUTO_PROMOTE || "true") !== "false";
  const wipLimit = Math.max(0, parseInt(process.env.WIP_LIMIT || "2", 10) || 0);

  const all = await github.paginate(github.rest.issues.listForRepo, {
    owner, repo, state: "open", per_page: 100,
  });
  const issues = all.filter((i) => !i.pull_request);

  const inWork = issues.filter((i) => IN_WORK.some((l) => labelSet(i).has(l)));

  const queue = issues
    .filter((i) => {
      const s = labelSet(i);
      return (
        s.has("approved") &&
        !IN_WORK.some((l) => s.has(l)) &&
        !s.has("needs-split") &&
        !s.has("awaiting-approval") &&
        !s.has(QUEUE_LABEL)
      );
    })
    .sort((a, b) => {
      const sa = labelSet(a), sb = labelSet(b);
      return (
        (PRIORITY[pick(sa, PRIORITY)] ?? 9) - (PRIORITY[pick(sb, PRIORITY)] ?? 9) ||
        (SIZE[pick(sa, SIZE)] ?? 9) - (SIZE[pick(sb, SIZE)] ?? 9) ||
        new Date(a.created_at) - new Date(b.created_at)
      );
    });

  // ── Заповнення вільних місць (ліворуч від пунктирної лінії → праворуч) ──
  const slots = Math.max(0, wipLimit - inWork.length);
  const promote = enabled && autoPromote ? queue.slice(0, slots) : [];
  for (const issue of promote) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: issue.number, labels: ["ready-for-dev"] });
    await github.rest.issues.createComment({
      owner, repo, issue_number: issue.number,
      body: "▶️ Prioritizer: задача перша в черзі й переходить у роботу (`ready-for-dev`).",
    });
    core.info(`Promoted #${issue.number}`);
  }
  const working = [...inWork, ...promote];
  const waiting = queue.slice(promote.length);

  // ── Дошка ──
  const header = "| # | Issue | Назва | P | Size | Blast | Вік |\n|---|---|---|---|---|---|---|";
  const status = enabled
    ? "🟢 **Конвеєр працює**"
    : "🔴 **КОНВЕЄР ЗУПИНЕНО (kill switch).** Нові задачі в роботу не беруться.";
  const reason = !enabled ? "" : !autoPromote ? "\n> Автопереведення вимкнене (`AUTO_PROMOTE=false`): `ready-for-dev` став руками." : "";
  const body = [
    status + reason,
    "",
    `### 🔨 В роботі: ${working.length} / ${wipLimit}`,
    working.length ? header + "\n" + working.map((i, n) => row(n + 1, i)).join("\n") : "_Нічого_",
    "",
    `┄┄┄┄┄┄┄┄ межа пропускної здатності (WIP = ${wipLimit}) ┄┄┄┄┄┄┄┄`,
    "",
    `### ⏳ Черга: ${waiting.length}`,
    waiting.length ? header + "\n" + waiting.map((i, n) => row(n + 1, i)).join("\n") : "_Порожньо_",
    "",
    `<sub>Оновлено: ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC · сортування: пріоритет → розмір → вік</sub>`,
  ].join("\n");

  const existing = issues.find((i) => labelSet(i).has(QUEUE_LABEL));
  if (existing) {
    await github.rest.issues.update({ owner, repo, issue_number: existing.number, body });
  } else {
    const { data } = await github.rest.issues.create({
      owner, repo, title: "📋 Черга задач (оновлюється автоматично)", body, labels: [QUEUE_LABEL],
    });
    try {
      await github.graphql(`mutation($id:ID!){ pinIssue(input:{issueId:$id}){ issue { number } } }`, { id: data.node_id });
    } catch (e) {
      core.warning(`Не вдалося закріпити issue: ${e.message}`);
    }
  }

  await core.summary.addRaw(body).write();
};
