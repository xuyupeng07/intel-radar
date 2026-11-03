import "server-only"

import { randomBytes } from "node:crypto"

import { getDb } from "@/lib/server/db/client"
import { defaultSettingsFor } from "@/lib/settings"
import { workspaceProfile, type WorkspaceRecord } from "@/lib/workspaces"

export type WorkspaceUsage = {
  items: number
  briefs: number
  runs: number
}

type WorkspaceRow = {
  id: string
  name: string
  industry: string
  description: string
}

function toRecord(row: WorkspaceRow): WorkspaceRecord {
  const profile = workspaceProfile(row.industry)
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    plan: row.description || profile.plan,
    briefLabel: profile.briefLabel,
    collectTarget: profile.collectTarget,
  }
}

/** 全部工作区，按创建时间排序（新工作区排在最后）。 */
export function listWorkspaces(): WorkspaceRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, industry, description FROM workspaces ORDER BY created_at ASC, id ASC"
    )
    .all() as WorkspaceRow[]
  return rows.map(toRecord)
}

export function getWorkspaceRecord(id: string | null | undefined): WorkspaceRecord | null {
  if (!id) return null
  const row = getDb()
    .prepare("SELECT id, name, industry, description FROM workspaces WHERE id = ?")
    .get(id) as WorkspaceRow | undefined
  return row ? toRecord(row) : null
}

export function workspaceExists(id: string): boolean {
  return Boolean(getWorkspaceRecord(id))
}

export function createWorkspace(input: { name: string; industry: string }): WorkspaceRecord {
  const db = getDb()
  const id = `ws_${randomBytes(4).toString("hex")}`
  const profile = workspaceProfile(input.industry)
  const now = new Date().toISOString()

  db.prepare(
    "INSERT INTO workspaces (id, name, industry, description, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, input.name, input.industry, profile.plan, now)

  // 全新领域：写一份通用模板设置（检索词 / 提示词都按领域名生成，用户再改）。
  // 不写 search_provider_keys，所以搜索源 Key 全为空。
  const settings = defaultSettingsFor(input.industry)
  db.prepare(
    "INSERT INTO app_settings (workspace_id, value, updated_at) VALUES (?, ?, ?)"
  ).run(id, JSON.stringify(settings), now)

  return {
    id,
    name: input.name,
    industry: input.industry,
    plan: profile.plan,
    briefLabel: profile.briefLabel,
    collectTarget: profile.collectTarget,
  }
}

/** 删除工作区时一并清理的表：都是按 workspace_id 归属的数据。 */
const WORKSPACE_TABLES = [
  "items",
  "briefs",
  "runs",
  "app_settings",
  "search_provider_keys",
  "webhook_endpoints",
  "scheduled_runs",
] as const

/** 每个工作区的数据量，删除确认时给人看。 */
export function workspaceUsage(id: string): WorkspaceUsage {
  const db = getDb()
  const count = (table: string) =>
    (
      db
        .prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE workspace_id = ?`)
        .get(id) as { total: number }
    ).total
  return {
    items: count("items"),
    briefs: count("briefs"),
    runs: count("runs"),
  }
}

export function listWorkspaceUsage(): Record<string, WorkspaceUsage> {
  return Object.fromEntries(
    listWorkspaces().map((workspace) => [workspace.id, workspaceUsage(workspace.id)])
  )
}

/**
 * 删除工作区：先清掉它名下的全部数据，再删 workspaces 行。
 * 一个事务，中途失败整体回滚；至少要保留一个工作区由调用方保证。
 */
export function deleteWorkspace(id: string): WorkspaceUsage {
  const db = getDb()
  const usage = workspaceUsage(id)
  db.exec("BEGIN")
  try {
    for (const table of WORKSPACE_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE workspace_id = ?`).run(id)
    }
    db.prepare("DELETE FROM workspaces WHERE id = ?").run(id)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return usage
}
