import type { DatabaseSync } from "node:sqlite"

import { logInfo } from "@/lib/server/logger"

import { isSearchProviderId } from "@/lib/search-providers"
import {
  AI_BRIEF_SYSTEM_PROMPT,
  AI_BRIEF_USER_PROMPT,
  DEFAULT_BRIEF_SYSTEM_PROMPT,
  DEFAULT_BRIEF_USER_PROMPT,
  DEFAULT_QUERIES,
  DEFAULT_SETTINGS,
  defaultSettingsFor,
} from "@/lib/settings"
import { SEED_WORKSPACES } from "@/lib/workspaces"

const HISTORICAL_VERSION = "13"
/** FastGPT 清理完成后的版本号，v15 再往上加。 */
const FASTGPT_REMOVAL_VERSION = "14"
const SCHEMA_VERSION = "15"

/** 当前代码期望的 schema 版本，健康检查与备份文件名都用它。 */
export function schemaVersion(): string {
  return SCHEMA_VERSION
}

/** v8 之前用一张 key-value 表混存 app 设置与 provider Key；迁移完成后删除。 */
const LEGACY_SETTINGS_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

const LEGACY_FINANCE_SYSTEM_PROMPT =
  "你是资深金融日报主编。只输出 JSON，不要解释。日报必须归纳主线，不能逐条罗列。"
const LEGACY_AI_SYSTEM_PROMPT =
  "你是资深 AI 行业日报主编。只输出 JSON，不要解释。日报必须归纳人工智能行业主线，不能逐条罗列。"

function ensureColumn(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as {
    name: string
  }[]
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
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

/**
 * v1 → v5：
 * - 删除 topics 表与 items.topic_id；
 * - 把旧 settings（deepseek-chat）迁移成 deepseek-flash + 检索词 + lang；
 * - 补上日报 system / user prompt；
 * - 增加 workspaces，并把已有数据归到 finance；AI 工作区使用独立设置；
 * - 清理旧主题式运行记录的目标名（保留时间、状态、错误与真实采集记录）；
 * - v5 把旧日报提示词升级为编号版，并补充事实约束；
 * - v6 把小标题从 01/02 改成 1./2.；
 * - v7 把结尾「判断」改为「情报洞察」；
 * - v8 把 app 设置与搜索源 Key 拆到 app_settings / search_provider_keys；
 * - v9 把单源 searchProvider 升级为可多选的 searchProviders 数组；
 * - v10 把板块改为跨行业分类，并提高每日情报/日报引用上限；
 * - v11 加入每日定时运行配置（默认 08:00）与 scheduled_runs 去重表；
 * - v12/v13 曾加入 FastGPT 知识库同步与日报工作流配置，现已随 v14 一并移除；
 * - v14 移除 FastGPT：删两张凭据表、清掉 app_settings 里的 fastgpt 字段与
 *   briefProvider，并删除历史「FastGPT 同步」运行记录。
 */
export function migrateDatabase(db: DatabaseSync): void {
  const version = metaGet(db, "schema_version")
  if (version === SCHEMA_VERSION) return

  // v1–v13 是历史链路，跑完把版本停在 HISTORICAL_VERSION；
  // 无论新库（version 为空）还是已在 v13 的库，最后都再走一次 v14 的清理。
  if (version !== HISTORICAL_VERSION) {
    runHistoricalMigrations(db)
  }
  runFastGPTRemovalMigration(db)
  runWebhookMigration(db)
}

/**
 * v15：群机器人（企业微信 / 钉钉 / 飞书）配置表。
 * 建表语句也在 schema.ts 的 SCHEMA_SQL 里，这里只补一次「老库升级」的显式动作。
 */
function runWebhookMigration(db: DatabaseSync): void {
  if (metaGet(db, "schema_version") === SCHEMA_VERSION) return
  db.exec(`CREATE TABLE IF NOT EXISTS webhook_endpoints (
    workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    secret TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (workspace_id, provider)
  )`)
  metaSet(db, "schema_version", SCHEMA_VERSION)
  logInfo("db.migrated", { to: SCHEMA_VERSION, step: "webhook_endpoints" })
}

/** v1 → v13 的历史迁移链；只在版本不是 v13 时执行一遍。 */
function runHistoricalMigrations(db: DatabaseSync): void {
  db.exec("BEGIN")
  try {
    // 老库与空库都先保证旧表存在，v1–v7 的迁移代码才能读取。
    db.exec(LEGACY_SETTINGS_SQL)
    db.exec("DROP TABLE IF EXISTS topics")
    db.exec("DROP INDEX IF EXISTS idx_items_topic")

    const itemColumns = db
      .prepare("PRAGMA table_info(items)")
      .all() as unknown as { name: string }[]
    if (itemColumns.some((column) => column.name === "topic_id")) {
      db.exec("ALTER TABLE items DROP COLUMN topic_id")
    }

    const settingsRow = db
      .prepare("SELECT value FROM settings WHERE key = 'app'")
      .get() as { value: string } | undefined
    if (settingsRow) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = JSON.parse(settingsRow.value) as Record<string, unknown>
      } catch {
        parsed = {}
      }

      const chatModel =
        typeof parsed.chatModel === "string" ? parsed.chatModel.trim() : ""
      if (
        !chatModel ||
        chatModel === "deepseek-chat" ||
        chatModel === "deepseek-reasoner"
      ) {
        parsed.chatModel = DEFAULT_SETTINGS.chatModel
      }

      const queries = Array.isArray(parsed.queries)
        ? parsed.queries.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0
          )
        : []
      if (queries.length === 0) parsed.queries = [...DEFAULT_QUERIES]
      if (parsed.searchLang !== "en") parsed.searchLang = "zh"

      if (
        typeof parsed.briefSystemPrompt !== "string" ||
        !parsed.briefSystemPrompt.trim()
      ) {
        parsed.briefSystemPrompt = DEFAULT_BRIEF_SYSTEM_PROMPT
      }
      if (
        typeof parsed.briefUserPrompt !== "string" ||
        !parsed.briefUserPrompt.includes("{{items}}")
      ) {
        parsed.briefUserPrompt = DEFAULT_BRIEF_USER_PROMPT
      }

      db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = 'app'").run(
        JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }),
        new Date().toISOString()
      )
    }

    const runColumns = db.prepare("PRAGMA table_info(runs)").all() as unknown as {
      name: string
    }[]
    const financeOnly = runColumns.some((column) => column.name === "workspace_id")
      ? " AND workspace_id = 'finance'"
      : ""
    db.prepare(
      `UPDATE runs SET target = '金融情报采集'
       WHERE job = '每日采集' AND target <> '金融情报采集'${financeOnly}`
    ).run()
    db.prepare(
      `UPDATE runs SET detail = replace(detail, '4 个主题 · ', '')
       WHERE job = '每日采集'${financeOnly}`
    ).run()
    db.prepare(
      `DELETE FROM runs WHERE id = 'r-04' AND status = '跳过'${financeOnly}`
    ).run()

    // v4：工作区隔离。已有数据一律归 finance，AI 工作区从空数据开始。
    ensureColumn(
      db,
      "items",
      "workspace_id",
      "workspace_id TEXT NOT NULL DEFAULT 'finance'"
    )
    ensureColumn(
      db,
      "briefs",
      "workspace_id",
      "workspace_id TEXT NOT NULL DEFAULT 'finance'"
    )
    ensureColumn(
      db,
      "runs",
      "workspace_id",
      "workspace_id TEXT NOT NULL DEFAULT 'finance'"
    )

    const now = new Date().toISOString()
    const insertWorkspace = db.prepare(
      `INSERT INTO workspaces (id, name, industry, description, created_at)
       VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
    )
    for (const workspace of SEED_WORKSPACES) {
      insertWorkspace.run(
        workspace.id,
        workspace.name,
        workspace.industry,
        workspace.plan,
        now
      )
    }

    const legacySettings = db
      .prepare("SELECT value FROM settings WHERE key = 'app'")
      .get() as { value: string } | undefined
    if (legacySettings) {
      db.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO NOTHING`
      ).run("app:finance", legacySettings.value, now)
      db.prepare("DELETE FROM settings WHERE key = 'app'").run()
    }

    const aiSettings = db
      .prepare("SELECT 1 AS ok FROM settings WHERE key = 'app:ai'")
      .get()
    if (!aiSettings) {
      db.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
      ).run("app:ai", JSON.stringify(defaultSettingsFor("人工智能")), now)
    }

    for (const table of ["items", "briefs", "runs"]) {
      db.prepare(
        `UPDATE ${table} SET workspace_id = 'finance'
         WHERE workspace_id IS NULL OR workspace_id = ''`
      ).run()
    }

    db.exec("DROP INDEX IF EXISTS idx_items_date")
    db.exec("DROP INDEX IF EXISTS idx_briefs_date")
    db.exec("DROP INDEX IF EXISTS idx_runs_created")
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_items_workspace_date ON items(workspace_id, date)"
    )
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_briefs_workspace_date ON briefs(workspace_id, date)"
    )
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_runs_workspace_created ON runs(workspace_id, created_at)"
    )

    // v5：把旧默认提示词升级为编号版，并补充事实约束。
    const promptRows = db
      .prepare(
        "SELECT key, value FROM settings WHERE key IN ('app:finance', 'app:ai')"
      )
      .all() as unknown as { key: string; value: string }[]

    for (const row of promptRows) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        continue
      }

      const isAi = row.key === "app:ai"
      const legacySystem = isAi
        ? LEGACY_AI_SYSTEM_PROMPT
        : LEGACY_FINANCE_SYSTEM_PROMPT
      const nextSystem = isAi
        ? AI_BRIEF_SYSTEM_PROMPT
        : DEFAULT_BRIEF_SYSTEM_PROMPT
      let changed = false

      const systemPrompt =
        typeof parsed.briefSystemPrompt === "string"
          ? parsed.briefSystemPrompt.replace(/\r\n?/g, "\n").trim()
          : ""
      if (systemPrompt === legacySystem) {
        parsed.briefSystemPrompt = nextSystem
        changed = true
      }

      if (typeof parsed.briefUserPrompt === "string") {
        let prompt = parsed.briefUserPrompt.replace(/\r\n?/g, "\n")
        prompt = prompt.replace(
          "- 接着 3–4 个主题小节，每个用「## 主题标题」；标题不超过 12 字，正文 1–2 段、每段 100–180 字。",
          "- 接着 3–4 个主题小节，每个用「## 01 主题标题」「## 02 主题标题」……；序号从 01 开始，标题不超过 12 字，正文 1–2 段、每段 100–180 字。"
        )
        prompt = prompt.replace(
          "- 标题直接写主题名，不要写 01/02、一、二 之类的序号；不要用一级标题 #；不要手工加粗标题。",
          "- 主题小节标题必须以 01、02……开头（两位数字 + 空格），导语与判断不加序号；不要用一级标题 #；不要写一、二或「第一部分」这类文字序号；不要手工加粗标题。"
        )
        if (!prompt.includes("数字、事实、引语必须来自情报")) {
          prompt = prompt.replace(
            "- 不要写来源列表，来源由系统追加；不要写“本文将”“综上所述”这类套话。",
            "- 数字、事实、引语必须来自情报，不得编造；判断只基于正文事实，不引入新信息。\n- 同一事实不要跨小节重复；每个主题小节只讲一条主线。\n- 不要写来源列表，来源由系统追加；不要写“本文将”“综上所述”这类套话。"
          )
        }
        if (prompt !== parsed.briefUserPrompt) {
          parsed.briefUserPrompt = prompt
          changed = true
        }
      }

      if (changed) {
        db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = ?").run(
          JSON.stringify(parsed),
          new Date().toISOString(),
          row.key
        )
      }
    }

    // v6：小标题序号从 01/02 改成 1./2.。
    const promptRowsV6 = db
      .prepare(
        "SELECT key, value FROM settings WHERE key IN ('app:finance', 'app:ai')"
      )
      .all() as unknown as { key: string; value: string }[]

    for (const row of promptRowsV6) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        continue
      }

      let changed = false
      if (typeof parsed.briefSystemPrompt === "string") {
        const next = parsed.briefSystemPrompt.replace(
          "主题小节用 01/02 编号",
          "主题小节用 1. 2. 编号"
        )
        if (next !== parsed.briefSystemPrompt) {
          parsed.briefSystemPrompt = next
          changed = true
        }
      }

      if (typeof parsed.briefUserPrompt === "string") {
        let prompt = parsed.briefUserPrompt
        prompt = prompt
          .replace(
            "「## 01 主题标题」「## 02 主题标题」",
            "「## 1. 主题标题」「## 2. 主题标题」"
          )
          .replace("序号从 01 开始", "序号从 1. 开始")
          .replace(
            "必须以 01、02……开头（两位数字 + 空格）",
            "必须以 1.、2.……开头（数字 + 英文句点 + 空格）"
          )
          .replace("## 01 主题一", "## 1. 主题一")
          .replace("## 02 主题二", "## 2. 主题二")
        if (prompt !== parsed.briefUserPrompt) {
          parsed.briefUserPrompt = prompt
          changed = true
        }
      }

      if (changed) {
        db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = ?").run(
          JSON.stringify(parsed),
          new Date().toISOString(),
          row.key
        )
      }
    }

    // v7：末节「判断」改名「情报洞察」，并固定在全文结尾。
    const promptRowsV7 = db
      .prepare(
        "SELECT key, value FROM settings WHERE key IN ('app:finance', 'app:ai')"
      )
      .all() as unknown as { key: string; value: string }[]

    for (const row of promptRowsV7) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        continue
      }

      let changed = false
      if (typeof parsed.briefSystemPrompt === "string") {
        const next = parsed.briefSystemPrompt.replace(
          "导语与判断不编号",
          "导语与情报洞察不编号"
        )
        if (next !== parsed.briefSystemPrompt) {
          parsed.briefSystemPrompt = next
          changed = true
        }
      }

      if (typeof parsed.briefUserPrompt === "string") {
        let prompt = parsed.briefUserPrompt
        prompt = prompt
          .replace(
            "给出今天最重要的判断",
            "给出今天最重要的结论"
          )
          .replace(
            "- 最后写「## 判断」，下面用「- 」列 3 条判断，每条 40–70 字。",
            "- 最后写「## 情报洞察」，下面用「- 」列 3 条洞察，每条 40–70 字；这是全文最后一节。"
          )
          .replace("导语与判断不加序号", "导语与情报洞察不加序号")
          .replace(
            "判断只基于正文事实，不引入新信息",
            "情报洞察只基于正文事实，不引入新信息"
          )
          .replace("## 判断", "## 情报洞察")
        if (prompt !== parsed.briefUserPrompt) {
          parsed.briefUserPrompt = prompt
          changed = true
        }
      }

      if (changed) {
        db.prepare("UPDATE settings SET value = ?, updated_at = ? WHERE key = ?").run(
          JSON.stringify(parsed),
          new Date().toISOString(),
          row.key
        )
      }
    }

    // v8：settings 表拆成 app_settings 与 search_provider_keys。
    const legacyAppRows = db
      .prepare("SELECT key, value, updated_at FROM settings WHERE key LIKE 'app:%'")
      .all() as unknown as { key: string; value: string; updated_at: string }[]
    const insertApp = db.prepare(
      `INSERT INTO app_settings (workspace_id, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(workspace_id) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    )
    for (const row of legacyAppRows) {
      const workspaceId = row.key.slice(4)
      const workspace = SEED_WORKSPACES.find((item) => item.id === workspaceId)
      if (!workspace) continue
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>
        insertApp.run(
          workspace.id,
          JSON.stringify({ ...defaultSettingsFor(workspace.industry), ...parsed }),
          row.updated_at
        )
      } catch {
        insertApp.run(
          workspace.id,
          JSON.stringify(defaultSettingsFor(workspace.industry)),
          row.updated_at
        )
      }
    }

    const legacyProviderRows = db
      .prepare(
        "SELECT key, value, updated_at FROM settings WHERE key LIKE 'provider:%'"
      )
      .all() as unknown as { key: string; value: string; updated_at: string }[]
    const insertProvider = db.prepare(
      `INSERT INTO search_provider_keys (workspace_id, provider_id, api_key, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(workspace_id, provider_id) DO UPDATE SET
         api_key = excluded.api_key,
         updated_at = excluded.updated_at`
    )
    for (const row of legacyProviderRows) {
      const [, workspaceId, providerId] = row.key.split(":")
      if (!workspaceId || !isSearchProviderId(providerId)) continue
      try {
        const parsed = JSON.parse(row.value) as { apiKey?: unknown }
        if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
          insertProvider.run(
            workspaceId,
            providerId,
            parsed.apiKey.trim(),
            row.updated_at
          )
        }
      } catch {
        // 坏数据直接跳过，迁移后仍然可以在设置页重新填写。
      }
    }

    // 工作区设置必须每个 workspace 都有一份；空库/缺行都补默认值。
    const hasAppSettings = db.prepare(
      "SELECT 1 AS ok FROM app_settings WHERE workspace_id = ?"
    )
    for (const workspace of SEED_WORKSPACES) {
      if (!hasAppSettings.get(workspace.id)) {
        insertApp.run(
          workspace.id,
          JSON.stringify(defaultSettingsFor(workspace.industry)),
          new Date().toISOString()
        )
      }
    }

    db.exec("DROP TABLE IF EXISTS settings")

    // v9：单源 searchProvider → 多选 searchProviders。
    const appRowsV9 = db
      .prepare("SELECT workspace_id, value FROM app_settings")
      .all() as unknown as { workspace_id: string; value: string }[]
    const updateAppV9 = db.prepare(
      "UPDATE app_settings SET value = ?, updated_at = ? WHERE workspace_id = ?"
    )
    for (const row of appRowsV9) {
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>
        const legacy = parsed.searchProvider
        let providers: string[] = []
        if (Array.isArray(parsed.searchProviders)) {
          providers = Array.from(
            new Set(parsed.searchProviders.filter(isSearchProviderId))
          )
        } else if (isSearchProviderId(legacy)) {
          providers = [legacy]
        }
        delete parsed.searchProvider
        parsed.searchProviders = providers.length > 0 ? providers : ["deepseek"]
        const workspace = SEED_WORKSPACES.find((item) => item.id === row.workspace_id)
        updateAppV9.run(
          JSON.stringify(
            workspace
              ? { ...defaultSettingsFor(workspace.industry), ...parsed }
              : parsed
          ),
          new Date().toISOString(),
          row.workspace_id
        )
      } catch {
        // 坏 JSON 留给 getSettings 的默认值兜底。
      }
    }

    // v10：跨行业板块 + 更高的每日情报/日报引用上限 + 新版日报提示词。
    const sectionRemap: Record<string, string> = {
      宏观与政策: "政策与监管",
      市场与资金: "市场与趋势",
      行业与公司: "公司与产品",
      资本事件: "资本与交易",
      观点与研报: "观点与研究",
    }
    const updateSection = db.prepare(
      "UPDATE items SET section = ? WHERE section = ?"
    )
    for (const [oldSection, newSection] of Object.entries(sectionRemap)) {
      updateSection.run(newSection, oldSection)
    }

    const appRowsV10 = db
      .prepare("SELECT workspace_id, value FROM app_settings")
      .all() as unknown as { workspace_id: string; value: string }[]
    const updateAppV10 = db.prepare(
      "UPDATE app_settings SET value = ?, updated_at = ? WHERE workspace_id = ?"
    )
    for (const row of appRowsV10) {
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>
        const itemLimit = Number(parsed.itemLimit)
        const briefItemLimit = Number(parsed.briefItemLimit)
        parsed.itemLimit = Math.min(120, Math.max(80, Number.isFinite(itemLimit) ? itemLimit : 0))
        parsed.briefItemLimit = Math.min(
          80,
          Math.max(60, Number.isFinite(briefItemLimit) ? briefItemLimit : 0)
        )

        const workspace = SEED_WORKSPACES.find((item) => item.id === row.workspace_id)
        if (workspace) {
          const oldSystem =
            typeof parsed.briefSystemPrompt === "string"
              ? parsed.briefSystemPrompt
              : ""
          const looksLikeDefault =
            !oldSystem ||
            /^你是资深(金融|AI 行业)日报主编/.test(oldSystem)
          if (looksLikeDefault) {
            parsed.briefSystemPrompt =
              workspace.id === "ai"
                ? AI_BRIEF_SYSTEM_PROMPT
                : DEFAULT_BRIEF_SYSTEM_PROMPT
            parsed.briefUserPrompt =
              workspace.id === "ai"
                ? AI_BRIEF_USER_PROMPT
                : DEFAULT_BRIEF_USER_PROMPT
          }
        }

        updateAppV10.run(
          JSON.stringify(parsed),
          new Date().toISOString(),
          row.workspace_id
        )
      } catch {
        // 坏 JSON 交给 getSettings 默认值兜底。
      }
    }

    // v11：定时运行配置。默认开启，每天 08:00；已有设置缺少字段时补齐。
    const appRowsV11 = db
      .prepare("SELECT workspace_id, value FROM app_settings")
      .all() as unknown as { workspace_id: string; value: string }[]
    const updateAppV11 = db.prepare(
      "UPDATE app_settings SET value = ?, updated_at = ? WHERE workspace_id = ?"
    )
    for (const row of appRowsV11) {
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>
        const workspace = SEED_WORKSPACES.find((item) => item.id === row.workspace_id)
        const defaults = defaultSettingsFor(workspace?.id ?? "finance")
        parsed.scheduleEnabled =
          typeof parsed.scheduleEnabled === "boolean"
            ? parsed.scheduleEnabled
            : defaults.scheduleEnabled
        parsed.scheduleTime =
          typeof parsed.scheduleTime === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.scheduleTime)
            ? parsed.scheduleTime
            : defaults.scheduleTime
        parsed.scheduleDays = Array.isArray(parsed.scheduleDays)
          ? Array.from(
              new Set(
                parsed.scheduleDays
                  .map((item) => Number(item))
                  .filter(
                    (item) => Number.isInteger(item) && item >= 1 && item <= 7
                  )
              )
            ).sort((a, b) => a - b)
          : [...defaults.scheduleDays]
        if (!Array.isArray(parsed.scheduleDays) || parsed.scheduleDays.length === 0) {
          parsed.scheduleDays = [...defaults.scheduleDays]
        }
        parsed.scheduleCatchUp =
          typeof parsed.scheduleCatchUp === "boolean"
            ? parsed.scheduleCatchUp
            : defaults.scheduleCatchUp
        updateAppV11.run(
          JSON.stringify(parsed),
          new Date().toISOString(),
          row.workspace_id
        )
      } catch {
        // 坏 JSON 交给 getSettings 默认值兜底。
      }
    }

    metaSet(db, "schema_version", HISTORICAL_VERSION)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

/**
 * v14：彻底摘掉 FastGPT。
 *
 * - 删掉 fastgpt_credentials / fastgpt_brief_credentials 两张凭据表；
 * - 清掉 app_settings JSON 里的 fastgpt* 字段与 briefProvider（日报只走本地 DeepSeek）；
 * - 删掉历史「FastGPT 同步」运行记录，避免运行记录里留下已不存在的重试入口。
 *
 * 幂等：表与记录不存在、JSON 已清理时都是 no-op。
 */
function runFastGPTRemovalMigration(db: DatabaseSync): void {
  db.exec("BEGIN")
  try {
    db.exec("DROP TABLE IF EXISTS fastgpt_credentials")
    db.exec("DROP TABLE IF EXISTS fastgpt_brief_credentials")
    db.prepare("DELETE FROM runs WHERE job = 'FastGPT 同步'").run()

    const rows = db
      .prepare("SELECT workspace_id, value FROM app_settings")
      .all() as unknown as { workspace_id: string; value: string }[]
    const update = db.prepare(
      "UPDATE app_settings SET value = ?, updated_at = ? WHERE workspace_id = ?"
    )
    for (const row of rows) {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        // 坏 JSON 交给 getSettings 的默认值兜底。
        continue
      }
      const stale = Object.keys(parsed).filter(
        (key) => key.startsWith("fastgpt") || key === "briefProvider"
      )
      if (stale.length === 0) continue
      for (const key of stale) delete parsed[key]
      update.run(JSON.stringify(parsed), new Date().toISOString(), row.workspace_id)
    }

    metaSet(db, "schema_version", FASTGPT_REMOVAL_VERSION)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
