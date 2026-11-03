import "server-only"

import type { WorkspaceId } from "@/lib/workspaces"
import { getDb } from "@/lib/server/db/client"

export type ScheduledRunStatus = "running" | "success" | "failed"

export type ScheduledRun = {
  workspaceId: WorkspaceId
  date: string
  scheduleTime: string
  status: ScheduledRunStatus
  startedAt: string
  finishedAt: string | null
  error: string | null
}

type ScheduledRunRow = {
  workspace_id: string
  date: string
  schedule_time: string
  status: string
  started_at: string
  finished_at: string | null
  error: string | null
}

function rowToRun(row: ScheduledRunRow): ScheduledRun {
  return {
    workspaceId: row.workspace_id as WorkspaceId,
    date: row.date,
    scheduleTime: row.schedule_time,
    status: row.status as ScheduledRunStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
  }
}

/** 进程被杀时 running 记录会一直挂着；超过这个时间视为僵尸并回收。 */
const STALE_RUN_MS = 3 * 60 * 60 * 1000

/**
 * 抢占当天这个计划时间的执行权。
 * 主键 (workspace_id, date, schedule_time) 保证开发热更新、多进程或多标签页
 * 同时到期时，同一天同一时间只会真正执行一次。
 *
 * 另外回收「进程中途退出」留下的 running 记录，否则当天再也补不上。
 */
export function claimScheduledRun(
  workspaceId: WorkspaceId,
  date: string,
  scheduleTime: string
): boolean {
  const db = getDb()
  db.prepare(
    `UPDATE scheduled_runs
     SET status = 'failed', finished_at = ?, error = '进程中断，已自动回收'
     WHERE status = 'running' AND started_at < ?`
  ).run(new Date().toISOString(), new Date(Date.now() - STALE_RUN_MS).toISOString())

  const result = db
    .prepare(
      `INSERT OR IGNORE INTO scheduled_runs
       (workspace_id, date, schedule_time, status, started_at)
       VALUES (?, ?, ?, 'running', ?)`
    )
    .run(workspaceId, date, scheduleTime, new Date().toISOString())
  return Number(result.changes) === 1
}

export function finishScheduledRun(
  workspaceId: WorkspaceId,
  date: string,
  scheduleTime: string,
  status: "success" | "failed",
  error?: string
): void {
  getDb()
    .prepare(
      `UPDATE scheduled_runs
       SET status = ?, finished_at = ?, error = ?
       WHERE workspace_id = ? AND date = ? AND schedule_time = ?`
    )
    .run(
      status,
      new Date().toISOString(),
      error ? error.slice(0, 800) : null,
      workspaceId,
      date,
      scheduleTime
    )
}

export function getScheduledRun(
  workspaceId: WorkspaceId,
  date: string,
  scheduleTime: string
): ScheduledRun | null {
  const row = getDb()
    .prepare(
      `SELECT workspace_id, date, schedule_time, status, started_at,
        finished_at, error
       FROM scheduled_runs
       WHERE workspace_id = ? AND date = ? AND schedule_time = ?`
    )
    .get(workspaceId, date, scheduleTime) as ScheduledRunRow | undefined
  return row ? rowToRun(row) : null
}

export function listRecentScheduledRuns(
  workspaceId: WorkspaceId,
  limit = 10
): ScheduledRun[] {
  const rows = getDb()
    .prepare(
      `SELECT workspace_id, date, schedule_time, status, started_at,
        finished_at, error
       FROM scheduled_runs
       WHERE workspace_id = ?
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .all(workspaceId, limit) as unknown as ScheduledRunRow[]
  return rows.map(rowToRun)
}
