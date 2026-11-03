import "server-only"

import type { Brief, BriefReport, IntelItem } from "@/lib/intel"
import type { WorkspaceId } from "@/lib/workspaces"
import { listBriefs } from "@/lib/server/repositories/briefs"
import { listAllItems } from "@/lib/server/repositories/items"

export type BriefEntry = {
  brief: Brief
  report: BriefReport
  items: IntelItem[]
}

/**
 * 日报归档：数据库里已发布的期次，按日期倒序；同一天「日报」排在「周报」前面。
 * 引用卡片优先按 report.sourceIds 取，旧数据缺少 sourceIds 时回落当天全部情报。
 */
export async function getBriefArchive(
  workspaceId: WorkspaceId
): Promise<BriefEntry[]> {
  const [records, allItems] = await Promise.all([
    listBriefs(workspaceId),
    listAllItems(workspaceId),
  ])
  const itemById = new Map(allItems.map((item) => [item.id, item]))

  const entries = records.map(({ brief, report }) => {
    const cited = report.sourceIds
      .map((id) => itemById.get(id))
      .filter((item): item is IntelItem => Boolean(item))
    const items = cited.length
      ? cited
      : allItems.filter((item) => item.date === brief.date)
    return { brief, report, items }
  })

  return entries.sort((a, b) => {
    const byDate = b.brief.date.localeCompare(a.brief.date)
    if (byDate !== 0) return byDate
    const aWeekly = a.brief.title.startsWith("周报") ? 1 : 0
    const bWeekly = b.brief.title.startsWith("周报") ? 1 : 0
    if (aWeekly !== bWeekly) return aWeekly - bWeekly
    return (b.brief.publishedAt ?? "").localeCompare(a.brief.publishedAt ?? "")
  })
}
