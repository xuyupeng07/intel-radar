import "server-only"

import type { DatabaseSync } from "node:sqlite"

import type { WorkspaceId } from "@/lib/workspaces"
import { getDb } from "@/lib/server/db/client"
import type { Brief, BriefReport } from "@/lib/intel"

type BriefRow = {
  id: string
  date: string
  weekday: string
  title: string
  summary: string
  status: string
  revision: number
  items: number
  sections: number
  read_minutes: number
  created_at: string
  published_at: string | null
  report: string
}

export type BriefRecord = {
  brief: Brief
  report: BriefReport
}

function parseReport(value: string): BriefReport {
  try {
    return JSON.parse(value) as BriefReport
  } catch {
    return { coverage: "", lead: "", sections: [], takeaways: [], sourceIds: [] }
  }
}

function rowToRecord(row: BriefRow): BriefRecord {
  return {
    brief: {
      id: row.id,
      date: row.date,
      weekday: row.weekday,
      title: row.title,
      summary: row.summary,
      status: row.status as Brief["status"],
      revision: row.revision,
      items: row.items,
      sections: row.sections,
      channels: [],
      openRate: null,
      readMinutes: row.read_minutes,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    },
    report: parseReport(row.report),
  }
}

const SELECT_BRIEF = `SELECT id, date, weekday, title, summary, status, revision, items,
  sections, read_minutes, created_at, published_at, report FROM briefs`

export async function listBriefs(workspaceId: WorkspaceId): Promise<BriefRecord[]> {
  const rows = getDb()
    .prepare(
      `${SELECT_BRIEF} WHERE workspace_id = ? AND status = '已发布'
       ORDER BY date DESC, created_at DESC`
    )
    .all(workspaceId) as unknown as BriefRow[]
  return rows.map(rowToRecord)
}

export async function getBrief(
  workspaceId: WorkspaceId,
  id: string
): Promise<BriefRecord | null> {
  const row = getDb()
    .prepare(`${SELECT_BRIEF} WHERE workspace_id = ? AND id = ?`)
    .get(workspaceId, id) as BriefRow | undefined
  return row ? rowToRecord(row) : null
}

export async function countBriefs(workspaceId: WorkspaceId): Promise<number> {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM briefs WHERE workspace_id = ? AND status = '已发布'"
    )
    .get(workspaceId) as { count: number }
  return row.count
}

export async function getBriefByDate(
  workspaceId: WorkspaceId,
  date: string
): Promise<BriefRecord | null> {
  const row = getDb()
    .prepare(
      `${SELECT_BRIEF} WHERE workspace_id = ? AND date = ?
       AND status = '已发布' AND title NOT LIKE '周报%'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(workspaceId, date) as BriefRow | undefined
  return row ? rowToRecord(row) : null
}

export async function latestBrief(
  workspaceId: WorkspaceId
): Promise<BriefRecord | null> {
  const row = getDb()
    .prepare(
      `${SELECT_BRIEF} WHERE workspace_id = ? AND status = '已发布'
       ORDER BY date DESC, created_at DESC LIMIT 1`
    )
    .get(workspaceId) as BriefRow | undefined
  return row ? rowToRecord(row) : null
}

const UPSERT_BRIEF = `INSERT INTO briefs (
  id, workspace_id, date, weekday, title, summary, status, revision, items,
  sections, read_minutes, created_at, published_at, report
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  workspace_id = excluded.workspace_id,
  date = excluded.date,
  weekday = excluded.weekday,
  title = excluded.title,
  summary = excluded.summary,
  status = excluded.status,
  revision = excluded.revision,
  items = excluded.items,
  sections = excluded.sections,
  read_minutes = excluded.read_minutes,
  created_at = excluded.created_at,
  published_at = excluded.published_at,
  report = excluded.report`

function upsert(
  db: DatabaseSync,
  workspaceId: WorkspaceId,
  brief: Brief,
  report: BriefReport
): void {
  db.prepare(UPSERT_BRIEF).run(
    brief.id,
    workspaceId,
    brief.date,
    brief.weekday,
    brief.title,
    brief.summary,
    brief.status,
    brief.revision,
    brief.items,
    brief.sections,
    brief.readMinutes,
    brief.createdAt,
    brief.publishedAt,
    JSON.stringify(report)
  )
}

export async function saveBrief(
  workspaceId: WorkspaceId,
  brief: Brief,
  report: BriefReport
): Promise<void> {
  upsert(getDb(), workspaceId, brief, report)
}

/**
 * 每日抓取替换当前工作区当天日报，但保留同日周报。
 */
export async function replaceDailyBrief(
  workspaceId: WorkspaceId,
  brief: Brief,
  report: BriefReport
): Promise<void> {
  const db = getDb()
  db.exec("BEGIN")
  try {
    db.prepare(
      `DELETE FROM briefs WHERE workspace_id = ? AND date = ?
       AND title NOT LIKE '周报%'`
    ).run(workspaceId, brief.date)
    upsert(db, workspaceId, brief, report)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
