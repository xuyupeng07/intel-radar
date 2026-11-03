import "server-only"

import type { DatabaseSync } from "node:sqlite"

import type { WorkspaceId } from "@/lib/workspaces"
import { getDb } from "@/lib/server/db/client"
import type { IntelItem, Section, SectionFilter } from "@/lib/intel"

type ItemRow = {
  id: string
  date: string
  section: string
  title: string
  summary: string
  why: string
  entities: string
  sources: string
  published_at: string
  fetched_at: string
  verification: string
  importance: number
  score: number
  saved: number
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function rowToItem(row: ItemRow): IntelItem {
  return {
    id: row.id,
    date: row.date,
    section: row.section as Section,
    title: row.title,
    summary: row.summary,
    why: row.why,
    entities: parseJson<string[]>(row.entities, []),
    sources: parseJson<IntelItem["sources"]>(row.sources, []),
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    verification: row.verification as IntelItem["verification"],
    importance: row.importance as IntelItem["importance"],
    score: row.score,
    saved: row.saved === 1,
  }
}

const SELECT_ITEM = `SELECT id, date, section, title, summary, why, entities, sources,
  published_at, fetched_at, verification, importance, score, saved FROM items`

export async function listItems(
  workspaceId: WorkspaceId,
  filter: {
    date?: string
    section?: SectionFilter
  } = {}
): Promise<IntelItem[]> {
  const db = getDb()
  const where: string[] = ["workspace_id = ?"]
  const params: (string | number)[] = [workspaceId]

  if (filter.date) {
    where.push("date = ?")
    params.push(filter.date)
  }
  if (filter.section && filter.section !== "all") {
    where.push("section = ?")
    params.push(filter.section)
  }

  const sql = `${SELECT_ITEM} WHERE ${where.join(" AND ")}
    ORDER BY importance DESC, score DESC, published_at DESC`
  const rows = db.prepare(sql).all(...params) as unknown as ItemRow[]
  return rows.map(rowToItem)
}

export async function listAllItems(workspaceId: WorkspaceId): Promise<IntelItem[]> {
  return listItems(workspaceId)
}

export async function getItem(
  workspaceId: WorkspaceId,
  id: string
): Promise<IntelItem | null> {
  const row = getDb()
    .prepare(`${SELECT_ITEM} WHERE workspace_id = ? AND id = ?`)
    .get(workspaceId, id) as ItemRow | undefined
  return row ? rowToItem(row) : null
}

export async function listItemDates(workspaceId: WorkspaceId): Promise<string[]> {
  const rows = getDb()
    .prepare(
      "SELECT DISTINCT date FROM items WHERE workspace_id = ? ORDER BY date DESC"
    )
    .all(workspaceId) as unknown as { date: string }[]
  return rows.map((row) => row.date)
}

export async function countItemsByDate(
  workspaceId: WorkspaceId
): Promise<Record<string, number>> {
  const rows = getDb()
    .prepare(
      "SELECT date, COUNT(*) AS count FROM items WHERE workspace_id = ? GROUP BY date ORDER BY date DESC"
    )
    .all(workspaceId) as unknown as { date: string; count: number }[]
  return Object.fromEntries(rows.map((row) => [row.date, row.count]))
}

export async function countItems(workspaceId: WorkspaceId): Promise<number> {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM items WHERE workspace_id = ?")
    .get(workspaceId) as { count: number }
  return row.count
}

const INSERT_ITEM = `INSERT INTO items (
  id, workspace_id, date, section, title, summary, why, entities, sources,
  published_at, fetched_at, verification, importance, score, saved, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

function insertItem(
  db: DatabaseSync,
  workspaceId: WorkspaceId,
  item: IntelItem
): void {
  db.prepare(INSERT_ITEM).run(
    item.id,
    workspaceId,
    item.date,
    item.section,
    item.title,
    item.summary,
    item.why,
    JSON.stringify(item.entities),
    JSON.stringify(item.sources),
    item.publishedAt,
    item.fetchedAt,
    item.verification,
    item.importance,
    item.score,
    item.saved ? 1 : 0,
    new Date().toISOString()
  )
}

/** 同一工作区同一天重新抓取时整日替换，避免重复条目。 */
export async function replaceItemsForDate(
  workspaceId: WorkspaceId,
  date: string,
  items: IntelItem[]
): Promise<void> {
  const db = getDb()
  db.exec("BEGIN")
  try {
    db.prepare("DELETE FROM items WHERE workspace_id = ? AND date = ?").run(
      workspaceId,
      date
    )
    for (const item of items) insertItem(db, workspaceId, { ...item, date })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
