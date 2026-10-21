import { createHmac } from 'node:crypto'
import { Bot } from 'grammy'
import { registerAdminCommands } from './admin.js'

const MIN_TEXT_LENGTH = 15
const MAX_ISSUES_PER_HOUR = 5
const HOUR_MS = 60 * 60 * 1000

/** @type {Map<number, 'bug' | 'idea'>} */
const pendingKind = new Map()

/** @type {Map<number, number[]>} */
const issueTimestamps = new Map()

const env = (name) => {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required env: ${name}`)
  }
  return value.trim()
}

const parseUserIds = (name) => {
  const raw = process.env[name]?.trim() ?? ''
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
  )
}

const parseAllowedUserIds = () => parseUserIds('ALLOWED_USER_IDS')

const REPORTER_SALT = env('REPORTER_SALT')
const GITHUB_TOKEN = env('GITHUB_TOKEN')
const GITHUB_REPO = env('GITHUB_REPO')
const TELEGRAM_TOKEN = env('TELEGRAM_TOKEN')

let allowedUserIds = parseAllowedUserIds()

const reporterTag = (userId) => {
  const hex = createHmac('sha256', REPORTER_SALT).update(String(userId)).digest('hex')
  return `tg-${hex.slice(0, 8)}`
}

const neutralize = (text) => text.replace(/@/g, '@\u200B')

const isAllowed = (userId) => {
  if (allowedUserIds.size === 0) return true
  return allowedUserIds.has(userId)
}

const checkRateLimit = (userId) => {
  const now = Date.now()
  const recent = (issueTimestamps.get(userId) ?? []).filter((t) => now - t < HOUR_MS)
  issueTimestamps.set(userId, recent)
  return recent.length < MAX_ISSUES_PER_HOUR
}

const recordIssue = (userId) => {
  const now = Date.now()
  const recent = issueTimestamps.get(userId) ?? []
  recent.push(now)
  issueTimestamps.set(userId, recent)
}

const titleFromText = (kind, text) => {
  const prefix = kind === 'idea' ? '[TG idea]' : '[TG bug]'
  const firstLine = text.split('\n')[0]?.trim() ?? text
  const body = firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine
  return `${prefix} ${body}`
}

const buildIssueBody = (kind, userId, text) => {
  const safe = neutralize(text.trim())
  const tag = reporterTag(userId)

  const parts =
    kind === 'bug'
      ? [
          '### Що сталося?',
          safe,
          '',
          '### Кроки відтворення',
          '(одне повідомлення з Telegram — додайте нумеровані кроки за потреби)',
          '',
          '### Що очікувалось?',
          '_не вказано_',
        ]
      : ['### Коротко', safe, '', '### Навіщо це потрібно?', '_не вказано_']

  return [
    ...parts,
    '',
    '### Середовище',
    'Telegram ingest',
    '',
    '### Репортер',
    tag,
    '',
    '_Created via telegram-ingest bot_',
  ].join('\n')
}

const githubHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

const postIssue = async (owner, repo, payload) => {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: githubHeaders,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  })
  const errText = res.ok ? null : await res.text()
  return { res, errText }
}

const createIssue = async (kind, userId, text) => {
  const [owner, repo] = GITHUB_REPO.split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be owner/repo')
  }

  const base = {
    title: titleFromText(kind, text),
    body: buildIssueBody(kind, userId, text),
  }

  let { res, errText } = await postIssue(owner, repo, { ...base, labels: ['source:user'] })

  if (!res.ok && res.status === 422 && errText?.includes('label')) {
    console.warn('GitHub: label source:user missing, creating issue without labels')
    ;({ res, errText } = await postIssue(owner, repo, base))
  }

  if (!res.ok) {
    console.error('GitHub API error', res.status, errText)
    const err = new Error(`GitHub ${res.status}`)
    err.status = res.status
    err.detail = errText
    throw err
  }

  return /** @type {{ html_url: string, number: number }} */ (await res.json())
}

const bot = new Bot(TELEGRAM_TOKEN)

// Kill switch (/stop, /resume, /pipeline) — лише якщо задано окремий токен і хоча б один адмін.
const GH_ADMIN_TOKEN = process.env.GH_ADMIN_TOKEN?.trim() ?? ''
const adminIds = parseUserIds('ADMIN_USER_IDS')
const adminEnabled = GH_ADMIN_TOKEN !== '' && adminIds.size > 0
if (adminEnabled) {
  registerAdminCommands(bot, { token: GH_ADMIN_TOKEN, repo: GITHUB_REPO, adminIds })
}

const submit = async (ctx, kind, userId, text) => {
  if (!isAllowed(userId)) {
    await ctx.reply('Доступ закритий для цього акаунта.')
    return
  }

  const trimmed = text.trim()
  if (trimmed.length < MIN_TEXT_LENGTH) {
    await ctx.reply(
      `Занадто коротко (мінімум ${MIN_TEXT_LENGTH} символів). Опиши детальніше, що сталося.`,
    )
    return
  }

  if (!checkRateLimit(userId)) {
    await ctx.reply('Ліміт: не більше 5 звернень на годину. Спробуй пізніше.')
    return
  }

  try {
    const issue = await createIssue(kind, userId, trimmed)
    recordIssue(userId)
    await ctx.reply(`Збережено: ${issue.html_url}`)
  } catch (err) {
    console.error('createIssue failed', err)
    if (err.status === 403) {
      await ctx.reply(
        'GitHub відхилив запит (403). Перевір GITHUB_TOKEN: fine-grained PAT з правом Issues → Read and write для ryzhaknode/sportapp.',
      )
      return
    }
    await ctx.reply('Не вдалося зберегти звернення. Спробуй пізніше.')
  }
}

bot.command('start', async (ctx) => {
  await ctx.reply('Gym ABC feedback bot. Команди: /bug, /idea, /help, /myid')
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '/bug [опис] — повідомити про баг',
      '/idea [опис] — запропонувати ідею',
      'Без тексту після команди — надішли опис наступним повідомленням.',
      '/myid — твій Telegram ID для whitelist',
    ].join('\n'),
  )
})

bot.command('myid', async (ctx) => {
  const id = ctx.from?.id
  if (id == null) {
    await ctx.reply('Не вдалося визначити ID.')
    return
  }
  await ctx.reply(`Твій Telegram user ID: ${id}`)
})

bot.command('bug', async (ctx) => {
  const userId = ctx.from?.id
  if (userId == null) return

  const match = (ctx.match ?? '').trim()
  if (!match) {
    pendingKind.set(userId, 'bug')
    await ctx.reply('Опиши баг одним повідомленням (мін. 15 символів).')
    return
  }
  pendingKind.delete(userId)
  await submit(ctx, 'bug', userId, match)
})

bot.command('idea', async (ctx) => {
  const userId = ctx.from?.id
  if (userId == null) return

  const match = (ctx.match ?? '').trim()
  if (!match) {
    pendingKind.set(userId, 'idea')
    await ctx.reply('Опиши ідею одним повідомленням (мін. 15 символів).')
    return
  }
  pendingKind.delete(userId)
  await submit(ctx, 'idea', userId, match)
})

bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id
  if (userId == null) return

  if (ctx.message.text.startsWith('/')) return

  const kind = pendingKind.get(userId)
  if (!kind) {
    await ctx.reply('Обери /bug або /idea і опиши проблему або ідею.')
    return
  }

  pendingKind.delete(userId)
  await submit(ctx, kind, userId, ctx.message.text)
})

bot.catch((err) => {
  console.error('Bot error', err)
})

const main = async () => {
  allowedUserIds = parseAllowedUserIds()

  await bot.api.setMyCommands([
    { command: 'bug', description: 'Повідомити про баг' },
    { command: 'idea', description: 'Запропонувати ідею' },
    { command: 'help', description: 'Допомога' },
    { command: 'myid', description: 'Мій Telegram ID' },
  ])

  const access =
    allowedUserIds.size === 0
      ? 'open (no ALLOWED_USER_IDS whitelist)'
      : `whitelist: ${allowedUserIds.size} user(s)`
  const admin = adminEnabled ? `on (${adminIds.size} admin(s))` : 'off'
  console.log(`telegram-ingest starting; repo=${GITHUB_REPO}; access=${access}; kill switch=${admin}`)
  await bot.start()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
