/** 服务端时区与日期工具：所有展示时间统一按 Asia/Shanghai。 */

export function todayInShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function weekdayCN(date: string): string {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return names[new Date(`${date}T12:00:00+08:00`).getUTCDay()] ?? ""
}

export function timeInShanghai(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(date)
}

export function dateInShanghai(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function nowTimeInShanghai(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date())
}

/** `2026-11-03` 这类真实存在的日期；`2026-13-45` 会被拒。 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00+08:00`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

export function dateMinusDays(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00+08:00`)
  base.setUTCDate(base.getUTCDate() - days)
  return base.toISOString().slice(0, 10)
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m${rest}s` : `${minutes}m`
}

/** ISO 星期：1=周一 … 7=周日，按 Asia/Shanghai。 */
export function isoWeekdayInShanghai(date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(date)
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday) + 1
}
