import "server-only"

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

import { migrateDatabase, schemaVersion } from "@/lib/server/db/migrate"
import { SCHEMA_SQL } from "@/lib/server/db/schema"
import { seedDatabase } from "@/lib/server/db/seed"
import { logInfo, logWarn } from "@/lib/server/logger"

const globalForDb = globalThis as unknown as {
  __intelRadarDb?: DatabaseSync
}

/** 备份上限：超过这个体积不再自动复制，避免启动时卡在 IO。 */
const BACKUP_MAX_BYTES = 64 * 1024 * 1024
const BACKUP_KEEP = 3

function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "intel.sqlite")
}

function pruneBackups(file: string): void {
  try {
    const dir = path.dirname(file)
    const prefix = `${path.basename(file)}.v`
    const backups = readdirSync(dir)
      .filter((name) => name.startsWith(prefix) && name.endsWith(".bak"))
      .map((name) => path.join(dir, name))
      .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
    for (const stale of backups.slice(BACKUP_KEEP)) unlinkSync(stale)
  } catch (error) {
    logWarn("db.backup_prune_failed", {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 迁移前留一份可回滚的副本：只在「已有库 + 版本将要变化」时触发，
 * 用 checkpoint 把 WAL 落盘后再复制，文件名带旧版本号，最多保留 3 份。
 * 设置 `DB_BACKUP_DISABLED=1` 可关掉（只读文件系统或外部已做备份时）。
 */
function backupBeforeMigration(db: DatabaseSync, file: string): void {
  if (process.env.DB_BACKUP_DISABLED === "1") return
  if (file === ":memory:" || !existsSync(file)) return

  const row = db
    .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
    .get() as { value?: string } | undefined
  const current = row?.value
  if (!current || current === schemaVersion()) return

  try {
    if (statSync(file).size > BACKUP_MAX_BYTES) {
      logWarn("db.backup_skipped", { reason: "file_too_large", bytes: statSync(file).size })
      return
    }
    db.exec("PRAGMA wal_checkpoint(FULL)")
    const target = `${file}.v${current}.bak`
    copyFileSync(file, target)
    pruneBackups(file)
    logInfo("db.backup", { from: current, to: schemaVersion(), target })
  } catch (error) {
    // 备份失败不阻断启动，但一定要在日志里可见。
    logWarn("db.backup_failed", {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 单例连接。SQLite 只适合本地单进程；上 MySQL 时替换这里与 repositories 的实现，
 * 页面与 Server Action 不需要改。
 */
export function getDb(): DatabaseSync {
  if (globalForDb.__intelRadarDb) return globalForDb.__intelRadarDb

  const file = databasePath()
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true })
  }

  const db = new DatabaseSync(file)
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  // 采集与页面读并发时，让写操作短暂等一下而不是立刻 SQLITE_BUSY。
  db.exec("PRAGMA busy_timeout = 5000")
  db.exec(SCHEMA_SQL)
  backupBeforeMigration(db, file)
  migrateDatabase(db)
  seedDatabase(db)

  globalForDb.__intelRadarDb = db
  return db
}

export function databaseFile(): string {
  return databasePath()
}
