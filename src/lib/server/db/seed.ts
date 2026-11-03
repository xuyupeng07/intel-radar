import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import type { DatabaseSync } from "node:sqlite"

import {
  BRIEF_REPORTS,
  INTEL_ITEMS,
  PUBLISHED_BRIEFS,
  TODAY,
  type Brief,
  type BriefReport,
  type IntelItem,
} from "@/lib/intel"
import { defaultSettingsFor } from "@/lib/settings"
import { SEED_WORKSPACES } from "@/lib/workspaces"
import { normalizeSection } from "@/lib/intel"

const SEED_VERSION = "3"

const SEED_RUNS = [
  {
    id: "r-01",
    job: "每日采集",
    target: "金融情报采集",
    status: "成功",
    startedAt: "08:14:02",
    duration: "2m18s",
    detail: "6 条 query · 56 条结果 · 18 条新增",
    date: TODAY,
  },
  {
    id: "r-02",
    job: "日报生成",
    target: `金融日报 · ${TODAY.slice(5)}`,
    status: "成功",
    startedAt: "08:22:31",
    duration: "2m41s",
    detail: "deepseek-flash · 18 条 · 来源 18 个",
    date: TODAY,
  },
  {
    id: "r-03",
    job: "每日采集",
    target: "金融情报采集",
    status: "成功",
    startedAt: "07:00:00",
    duration: "1m42s",
    detail: "6 条 query · 48 条结果 · 15 条新增",
    date: TODAY,
  },
  {
    id: "r-04",
    job: "日报生成",
    target: "金融日报 · 10-22",
    status: "失败",
    startedAt: "08:21:08",
    duration: "1m12s",
    detail: "模型返回 JSON 解析失败，未写入日报",
    date: "2026-10-22",
  },
] as const

type LegacyLiveDay = {
  date: string
  items: IntelItem[]
  brief: Brief
  report: BriefReport
}

function metaGet(db: DatabaseSync, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function metaSet(db: DatabaseSync, key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value)
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function insertItem(
  db: DatabaseSync,
  workspaceId: string,
  item: IntelItem
): void {
  db.prepare(
    `INSERT INTO items (
      id, workspace_id, date, section, title, summary, why, entities, sources,
      published_at, fetched_at, verification, importance, score, saved, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      date = excluded.date,
      section = excluded.section,
      title = excluded.title,
      summary = excluded.summary,
      why = excluded.why,
      entities = excluded.entities,
      sources = excluded.sources,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      verification = excluded.verification,
      importance = excluded.importance,
      score = excluded.score,
      saved = excluded.saved`
  ).run(
    item.id,
    workspaceId,
    item.date,
    item.section,
    item.title,
    item.summary,
    item.why,
    json(item.entities),
    json(item.sources),
    item.publishedAt,
    item.fetchedAt,
    item.verification,
    item.importance,
    item.score,
    item.saved ? 1 : 0,
    new Date().toISOString()
  )
}

function insertBrief(
  db: DatabaseSync,
  workspaceId: string,
  brief: Brief,
  report: BriefReport
): void {
  db.prepare(
    `INSERT INTO briefs (
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
  ).run(
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
    json(report)
  )
}

function seedSample(db: DatabaseSync): void {
  const now = new Date().toISOString()

  const insertWorkspace = db.prepare(
    `INSERT INTO workspaces (id, name, industry, description, created_at)
     VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
  )
  SEED_WORKSPACES.forEach((workspace, index) => {
    // 逐个加 1ms：新库的工作区顺序按创建时间稳定，金融永远排第一。
    insertWorkspace.run(
      workspace.id,
      workspace.name,
      workspace.industry,
      workspace.plan,
      new Date(Date.now() + index).toISOString()
    )
  })

  for (const item of INTEL_ITEMS) insertItem(db, "finance", item)

  for (const brief of PUBLISHED_BRIEFS) {
    const report = BRIEF_REPORTS[brief.id]
    if (!report) continue
    insertBrief(db, "finance", brief, report)
  }

  const insertRun = db.prepare(
    `INSERT INTO runs (
      id, workspace_id, job, target, status, started_at, duration, detail, date,
      error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`
  )
  for (const run of SEED_RUNS) {
    insertRun.run(
      run.id,
      "finance",
      run.job,
      run.target,
      run.status,
      run.startedAt,
      run.duration,
      run.detail,
      run.date,
      run.status === "失败" ? run.detail : null,
      `${run.date}T${run.startedAt}+08:00`
    )
  }

  const insertSettings = db.prepare(
    "INSERT INTO app_settings (workspace_id, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(workspace_id) DO NOTHING"
  )
  for (const workspace of SEED_WORKSPACES) {
    insertSettings.run(workspace.id, json(defaultSettingsFor(workspace.id)), now)
  }
}

/**
 * 把旧版 `.data/live/*.json` 迁进 SQLite。
 * 只在第一次启动时执行，之后数据库就是唯一事实源。
 */
function importLegacyLiveDays(db: DatabaseSync): void {
  if (metaGet(db, "legacy_live_imported") === "1") return

  const dir = path.join(process.cwd(), ".data", "live")
  let files: string[] = []
  try {
    files = readdirSync(dir).filter((file) => file.endsWith(".json"))
  } catch {
    files = []
  }

  for (const file of files) {
    try {
      const parsed = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as LegacyLiveDay
      if (!parsed.date || !Array.isArray(parsed.items) || !parsed.brief) continue

      db.prepare("DELETE FROM items WHERE workspace_id = 'finance' AND date = ?").run(
        parsed.date
      )
      for (const item of parsed.items) {
        insertItem(db, "finance", {
          ...item,
          date: parsed.date,
          section: normalizeSection(item.section),
        })
      }

      // 同一天的手工样例日报让位给真实抓取结果，但保留周报。
      db.prepare(
        "DELETE FROM briefs WHERE workspace_id = 'finance' AND date = ? AND title NOT LIKE '周报%'"
      ).run(parsed.date)
      insertBrief(db, "finance", parsed.brief, parsed.report)
    } catch {
      // 单个脏文件不影响其它迁移。
    }
  }

  metaSet(db, "legacy_live_imported", "1")
}

export function seedDatabase(db: DatabaseSync): void {
  // 只要已经 seed 过就不再写样例：v1 老库交给 migrateDatabase 处理。
  if (metaGet(db, "seed_version") !== null) return

  db.exec("BEGIN")
  try {
    seedSample(db)
    importLegacyLiveDays(db)
    metaSet(db, "seed_version", SEED_VERSION)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
