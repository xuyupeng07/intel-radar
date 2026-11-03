/**
 * SQLite schema（MVP）。
 *
 * 约束：
 * - 只依赖 SQLite 通用能力，不写触发器、不写 JSON1 查询，方便后续迁移 MySQL。
 * - 业务查询全部走 repositories，页面不直接拼 SQL。
 * - 采集参数在 app_settings，搜索源 Key 在 search_provider_keys，群机器人配置在 webhook_endpoints，
 *   都按 workspace 隔离。
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'finance',
  date TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  entities TEXT NOT NULL DEFAULT '[]',
  sources TEXT NOT NULL DEFAULT '[]',
  published_at TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL DEFAULT '',
  verification TEXT NOT NULL DEFAULT 'single',
  importance INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'finance',
  date TEXT NOT NULL,
  weekday TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  items INTEGER NOT NULL DEFAULT 0,
  sections INTEGER NOT NULL DEFAULT 0,
  read_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  published_at TEXT,
  report TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'finance',
  job TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '—',
  detail TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  workspace_id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_provider_keys (
  workspace_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, provider_id)
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  secret TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS scheduled_runs (
  workspace_id TEXT NOT NULL,
  date TEXT NOT NULL,
  schedule_time TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error TEXT,
  PRIMARY KEY (workspace_id, date, schedule_time)
);
`
