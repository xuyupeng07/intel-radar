/**
 * DeepSeek Search 的查询语法：站点 / 短语过滤 + `lang` / `after`。
 *
 * 设置页的「发出的 query 预览」与采集时真正发给 DeepSeek 的 query 共用这一份实现，
 * 避免两边各拼一套导致预览和实际请求不一致。这里不依赖数据库与 server-only，
 * 客户端与服务端都能 import。
 */

export type DeepSeekSyntax = {
  /** 限定站点，存成 `github.com, 36kr.com`；查询里拼成 `site:github.com site:36kr.com`。 */
  includeSites: string
  /** 排除站点；查询里拼成 `-site:example.com`。 */
  excludeSites: string
  /** 精确短语；查询里拼成 `"…"`。 */
  exactPhrase: string
  /** 排除短语；查询里拼成 `-"…"`。 */
  excludePhrase: string
}

export const EMPTY_DEEPSEEK_SYNTAX: DeepSeekSyntax = {
  includeSites: "",
  excludeSites: "",
  exactPhrase: "",
  excludePhrase: "",
}

/** 站点最多 8 个、短语最多 40 字，避免 query 过长被搜索侧截断。 */
export const MAX_SYNTAX_SITES = 8
export const MAX_SYNTAX_PHRASE_LENGTH = 40

/** `https://www.github.com/foo` → `github.com`。 */
export function normalizeSite(raw: string): string {
  return raw
    .trim()
    .replace(/^-?site:/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[/?#].*$/, "")
    .replace(/[^\w.-]/g, "")
    .toLowerCase()
}

export function isValidSite(site: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
    site
  )
}

/** 逗号 / 顿号 / 空格 / 换行都能分隔站点；去重、去协议、最多 8 个。 */
export function normalizeSiteList(raw: string): string[] {
  const sites = new Set<string>()
  for (const token of raw.split(/[\s,，、;；]+/)) {
    const site = normalizeSite(token)
    if (site) sites.add(site)
  }
  return Array.from(sites).slice(0, MAX_SYNTAX_SITES)
}

/** 去掉用户带进来的引号，压掉多余空白，按字数截断。 */
export function normalizePhrase(
  raw: string,
  limit = MAX_SYNTAX_PHRASE_LENGTH
): string {
  return raw
    .replace(/^[\s"'“”‘’]+/, "")
    .replace(/[\s"'“”‘’]+$/, "")
    .replace(/\s+/g, " ")
    .slice(0, limit)
}

/** 只拼站点 / 短语，不含 lang、after；设置页用来分行展示。 */
export function syntaxTokens(syntax: DeepSeekSyntax): string[] {
  const tokens: string[] = []
  for (const site of normalizeSiteList(syntax.includeSites)) {
    tokens.push(`site:${site}`)
  }
  for (const site of normalizeSiteList(syntax.excludeSites)) {
    tokens.push(`-site:${site}`)
  }
  const exact = normalizePhrase(syntax.exactPhrase)
  if (exact) tokens.push(`"${exact}"`)
  const excluded = normalizePhrase(syntax.excludePhrase)
  if (excluded) tokens.push(`-"${excluded}"`)
  return tokens
}

/**
 * 一条检索词的最终 query：
 * `大模型 发布 … site:github.com -site:example.com "精确短语" lang:zh after:2026-11-02`
 */
export function buildDeepSeekQuery(
  query: string,
  options: {
    syntax?: DeepSeekSyntax | null
    /** 已计算好的语言与日期（服务端由 searchLang / lookbackDays 得出）。 */
    lang?: string
    after?: string
  } = {}
): string {
  const parts = [query.trim(), ...syntaxTokens(options.syntax ?? EMPTY_DEEPSEEK_SYNTAX)]
  if (options.lang) parts.push(`lang:${options.lang}`)
  if (options.after) parts.push(`after:${options.after}`)
  return parts.filter(Boolean).join(" ")
}

/** 「2 个站点 · 1 条短语」，设置页与运营看板的状态摘要。 */
export function syntaxSummary(syntax: DeepSeekSyntax): string {
  const sites =
    normalizeSiteList(syntax.includeSites).length +
    normalizeSiteList(syntax.excludeSites).length
  const phrases = [
    normalizePhrase(syntax.exactPhrase),
    normalizePhrase(syntax.excludePhrase),
  ].filter(Boolean).length
  if (sites === 0 && phrases === 0) return "未设置"
  return [sites > 0 ? `${sites} 个站点` : null, phrases > 0 ? `${phrases} 条短语` : null]
    .filter(Boolean)
    .join(" · ")
}

/** 客户端预览用：今天的 Asia/Shanghai 日期。 */
export function shanghaiTodayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** 日期字符串减天数（按 UTC 日历算，不受浏览器时区影响）。 */
export function isoMinusDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return iso
  const base = new Date(Date.UTC(year, month - 1, day))
  base.setUTCDate(base.getUTCDate() - days)
  const y = base.getUTCFullYear()
  const m = String(base.getUTCMonth() + 1).padStart(2, "0")
  const d = String(base.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
