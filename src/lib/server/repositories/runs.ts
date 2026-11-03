import "server-only"

import { randomUUID } from "node:crypto"

import type { WorkspaceId } from "@/lib/workspaces"
import { getDb } from "@/lib/server/db/client"
import type { Run } from "@/lib/intel"

export type RunRecord = Run & {
  date: string
  error: string | null
  createdAt: string
}

type RunRow = {
  id: string
  job: string
  target: string
  status: string
  started_at: string
  duration: string
  detail: string
  date: string
  error: string | null
  created_at: string
}

function rowToRun(row: RunRow): RunRecord {
  return {
    id: row.id,
    job: row.job,
    target: row.target,
    status: row.status as Run["status"],
    startedAt: row.started_at,
    duration: row.duration,
    detail: row.detail,
    date: row.date,
    error: row.error,
    createdAt: row.created_at,
  }
}

const SELECT_RUN = `SELECT id, job, target, status, started_at, duration, detail,
  date, error, created_at FROM runs`

export async function listRuns(
  workspaceId: WorkspaceId,
  limit = 100
): Promise<RunRecord[]> {
  const rows = getDb()
    .prepare(
      `${SELECT_RUN} WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(workspaceId, limit) as unknown as RunRow[]
  return rows.map(rowToRun)
}

export async function getRun(
  workspaceId: WorkspaceId,
  id: string
): Promise<RunRecord | null> {
  const row = getDb()
    .prepare(`${SELECT_RUN} WHERE workspace_id = ? AND id = ?`)
    .get(workspaceId, id) as RunRow | undefined
  return row ? rowToRun(row) : null
}

export type StartRunInput = {
  workspaceId: WorkspaceId
  job: string
  target: string
  date: string
  startedAt: string
  detail?: string
}

export async function startRun(input: StartRunInput): Promise<string> {
  const id = `r-${randomUUID()}`
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO runs (
        id, workspace_id, job, target, status, started_at, duration, detail,
        date, error, created_at
      ) VALUES (?, ?, ?, ?, '运行中', ?, '进行中', ?, ?, NULL, ?)`
    )
    .run(
      id,
      input.workspaceId,
      input.job,
      input.target,
      input.startedAt,
      input.detail ?? "",
      input.date,
      now
    )
  return id
}

export async function finishRun(
  id: string,
  update: {
    status: Run["status"]
    duration: string
    detail: string
    error?: string | null
  }
): Promise<void> {
  getDb()
    .prepare("UPDATE runs SET status = ?, duration = ?, detail = ?, error = ? WHERE id = ?")
    .run(update.status, update.duration, update.detail, update.error ?? null, id)
}

export async function latestRun(
  workspaceId: WorkspaceId,
  job?: string
): Promise<RunRecord | null> {
  const row = job
    ? (getDb()
        .prepare(
          `${SELECT_RUN} WHERE workspace_id = ? AND job = ?
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(workspaceId, job) as RunRow | undefined)
    : (getDb()
        .prepare(
          `${SELECT_RUN} WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`
        )
        .get(workspaceId) as RunRow | undefined)
  return row ? rowToRun(row) : null
}
