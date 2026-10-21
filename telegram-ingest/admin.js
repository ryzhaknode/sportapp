/**
 * Kill switch у Telegram: /stop, /resume, /pipeline — лише для адмінів.
 * Працює миттєво: напряму міняє змінну PIPELINE_ENABLED і скасовує запуски,
 * не чекаючи, поки GitHub знайде вільний раннер.
 *
 * Потрібен ОКРЕМИЙ fine-grained токен (GH_ADMIN_TOKEN):
 *   тільки цей репо · Variables: Read and write · Actions: Read and write
 */
const API = "https://api.github.com";
const VAR = "PIPELINE_ENABLED";

export function registerAdminCommands(bot, { token, repo, adminIds }) {
  const gh = (method, path, body) =>
    fetch(`${API}/repos/${repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

  async function setEnabled(value) {
    let res = await gh("PATCH", `/actions/variables/${VAR}`, { name: VAR, value });
    if (res.status === 404) res = await gh("POST", "/actions/variables", { name: VAR, value });
    if (!res.ok) throw new Error(`variables ${res.status}: ${await res.text()}`);
  }

  async function getEnabled() {
    const res = await gh("GET", `/actions/variables/${VAR}`);
    if (res.status === 404) return true; // змінної немає = конвеєр працює
    if (!res.ok) throw new Error(`variables ${res.status}`);
    return (await res.json()).value !== "false";
  }

  async function cancelRuns() {
    let cancelled = 0;
    for (const status of ["in_progress", "queued"]) {
      const res = await gh("GET", `/actions/runs?status=${status}&per_page=100`);
      if (!res.ok) continue;
      const { workflow_runs = [] } = await res.json();
      for (const run of workflow_runs) {
        const c = await gh("POST", `/actions/runs/${run.id}/cancel`);
        if (c.ok) cancelled++;
      }
    }
    return cancelled;
  }

  const refreshBoard = () =>
    gh("POST", "/actions/workflows/prioritizer.yml/dispatches", { ref: "main" }).catch(() => {});

  const adminOnly = (handler) => async (ctx) => {
    if (!adminIds.has(ctx.from?.id)) return ctx.reply("Ця команда доступна лише адміністратору.");
    try {
      await handler(ctx);
    } catch (err) {
      console.error("Admin command error:", err.message);
      await ctx.reply("⚠️ Не вдалося виконати команду. Перевір токен GH_ADMIN_TOKEN і логи бота.");
    }
  };

  bot.command("stop", adminOnly(async (ctx) => {
    await setEnabled("false");
    const n = await cancelRuns();
    await refreshBoard();
    await ctx.reply(`🔴 Конвеєр зупинено. Скасовано запусків: ${n}.\nВідновити: /resume`);
  }));

  bot.command("resume", adminOnly(async (ctx) => {
    await setEnabled("true");
    await refreshBoard();
    await ctx.reply("🟢 Конвеєр знову працює.");
  }));

  bot.command("pipeline", adminOnly(async (ctx) => {
    const on = await getEnabled();
    await ctx.reply(on ? "🟢 Конвеєр працює." : "🔴 Конвеєр зупинено. Відновити: /resume");
  }));
}
