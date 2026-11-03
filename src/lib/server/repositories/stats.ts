import "server-only"

import { getDb } from "@/lib/server/db/client"
import { latestRun, type RunRecord } from "@/lib/server/repositories/runs"
import { latestBrief } from "@/lib/server/repositories/briefs"
import { SECTIONS, type Section } from "@/lib/intel"
import type { WorkspaceId } from "@/lib/workspaces"

export type AdminOverview = {
  latestDate: string
  latestItems: number
  previousItems: number
  items7d: number
  itemTrend: number[]
  runsOnLatestDate: number
  runsSucceeded: number
  sections: { section: Section; count: number }[]
  lastIngest: RunRecord | null
  latestBriefDate: string | null
}

export async function getAdminOverview(workspaceId: WorkspaceId): Promise<AdminOverview> {
  const db = getDb()

  const dateRows = db
    .prepare(
      "SELECT date, COUNT(*) AS count FROM items WHERE workspace_id = ? GROUP BY date ORDER BY date DESC"
    )
    .all(workspaceId) as unknown as { date: string; count: number }[]

  const latestDate = dateRows[0]?.date ?? ""
  const latestItems = dateRows[0]?.count ?? 0
  const previousItems = dateRows[1]?.count ?? 0
  const lastSeven = dateRows.slice(0, 7)
  const items7d = lastSeven.reduce((sum, row) => sum + row.count, 0)

  const runRow = db
    .prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = '成功' THEN 1 ELSE 0 END), 0) AS succeeded FROM runs WHERE workspace_id = ? AND date = ?"
    )
    .get(workspaceId, latestDate) as { total: number; succeeded: number }

  const sectionRows = db
    .prepare(
      "SELECT section, COUNT(*) AS count FROM items WHERE workspace_id = ? AND date = ? GROUP BY section"
    )
    .all(workspaceId, latestDate) as unknown as { section: Section; count: number }[]
  const sectionMap = new Map(sectionRows.map((row) => [row.section, row.count]))

  const brief = await latestBrief(workspaceId)

  return {
    latestDate,
    latestItems,
    previousItems,
    items7d,
    itemTrend: lastSeven.map((row) => row.count).reverse(),
    runsOnLatestDate: runRow.total,
    runsSucceeded: runRow.succeeded,
    sections: SECTIONS.map((section) => ({
      section,
      count: sectionMap.get(section) ?? 0,
    })),
    lastIngest: await latestRun(workspaceId, "每日采集"),
    latestBriefDate: brief?.brief.date ?? null,
  }
}
