import type { IntelItem } from "@/lib/intel"

type CoveragePoint = {
  date: string
  time: string | null
  at: number
}

function shanghaiDate(value: string): { date: string; time: string } | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(parsed)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  const date = `${get("year")}-${get("month")}-${get("day")}`
  const time = `${get("hour")}:${get("minute")}`
  return date && time ? { date, time } : null
}

function yearForMonthDay(itemDate: string, month: number): number {
  const itemMonth = Number(itemDate.slice(5, 7))
  const itemYear = Number(itemDate.slice(0, 4))
  return month > itemMonth ? itemYear - 1 : itemYear
}

/**
 * 从新闻的发布时间解析覆盖点，而不是使用模型生成的 coverage 文案。
 * 优先级：publishedAt → sources[0].time → fetchedAt。
 */
function coveragePoint(item: IntelItem): CoveragePoint | null {
  const candidates = [item.publishedAt, item.sources[0]?.time, item.fetchedAt]
  for (const raw of candidates) {
    const text = raw?.trim()
    if (!text) continue

    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const [hour, minute] = text.split(":").map(Number)
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      return {
        date: item.date,
        time,
        at: new Date(`${item.date}T${time}:00+08:00`).getTime(),
      }
    }

    const monthDay = /^(\d{1,2})-(\d{1,2})$/.exec(text)
    if (monthDay) {
      const month = Number(monthDay[1])
      const day = Number(monthDay[2])
      const year = yearForMonthDay(item.date, month)
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      return {
        date,
        time: null,
        at: new Date(`${date}T00:00:00+08:00`).getTime(),
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return {
        date: text,
        time: null,
        at: new Date(`${text}T00:00:00+08:00`).getTime(),
      }
    }

    if (text.includes("T") || /^\d{4}-\d{2}-\d{2}\s/.test(text)) {
      const exact = shanghaiDate(text)
      if (exact) {
        return {
          date: exact.date,
          time: exact.time,
          at: new Date(`${exact.date}T${exact.time}:00+08:00`).getTime(),
        }
      }
    }
  }
  return null
}

function pointLabel(point: CoveragePoint): string {
  const monthDay = point.date.slice(5).replace("-", ".")
  return point.time ? `${monthDay} ${point.time}` : monthDay
}

/**
 * 根据当期引用的新闻发布时间计算覆盖范围。
 * 无可用时间时回落日报日期，保证页面永远有可读的区间。
 */
export function briefCoverage(items: IntelItem[], fallbackDate: string): string {
  const points = items
    .map(coveragePoint)
    .filter((point): point is CoveragePoint => Boolean(point))
    .sort((a, b) => a.at - b.at)

  if (points.length === 0) return fallbackDate.slice(5).replace("-", ".")

  const start = points[0]
  const end = points[points.length - 1]

  if (start.date === end.date) {
    if (start.time && end.time && start.time !== end.time) {
      return `${pointLabel(start)} — ${pointLabel(end)}`
    }
    return pointLabel(start)
  }

  return `${pointLabel(start)} — ${pointLabel(end)}`
}
