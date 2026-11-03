import "server-only"

import {
  SEARCH_PROVIDER_IDS,
  SEARCH_PROVIDERS,
  isSearchProviderId,
  maskApiKey,
  searchProviderById,
  type SearchProviderId,
  type SearchProviderState,
} from "@/lib/search-providers"
import {
  EMPTY_DEEPSEEK_SYNTAX,
  normalizePhrase,
  normalizeSiteList,
  type DeepSeekSyntax,
} from "@/lib/deepseek-query"
import {
  defaultSettingsFor,
  type AppSettings,
  type SearchLang,
} from "@/lib/settings"
import type { WorkspaceId } from "@/lib/workspaces"
import { getDb } from "@/lib/server/db/client"

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function normalizeQueries(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const queries = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 100))
        .filter(Boolean)
    )
  ).slice(0, 8)
  return queries.length > 0 ? queries : [...fallback]
}

function normalizeLang(value: unknown): SearchLang {
  return value === "en" || value === "zh,en" ? value : "zh"
}

function normalizeScheduleTime(value: unknown, fallback: string): string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : fallback
}

function normalizeScheduleDays(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback]
  const days = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7)
    )
  ).sort((a, b) => a - b)
  return days.length > 0 ? days : [...fallback]
}

function normalizeProviders(value: unknown, fallback: SearchProviderId[]): SearchProviderId[] {
  if (Array.isArray(value)) {
    const providers = Array.from(
      new Set(value.filter(isSearchProviderId))
    )
    if (providers.length > 0) {
      return SEARCH_PROVIDER_IDS.filter((id) => providers.includes(id))
    }
  }
  // 兼容 v8 之前的单源字段。
  if (isSearchProviderId(value)) return [value]
  return SEARCH_PROVIDER_IDS.filter((id) => fallback.includes(id))
}

/** 兼容没有该字段的旧库：数组或字符串都收，统一存成逗号分隔的站点列表。 */
function normalizeSyntax(value: unknown): DeepSeekSyntax {
  if (!value || typeof value !== "object") return { ...EMPTY_DEEPSEEK_SYNTAX }
  const raw = value as Record<string, unknown>
  const sites = (input: unknown): string => {
    if (Array.isArray(input)) {
      const joined = input
        .filter((item): item is string => typeof item === "string")
        .join(", ")
      return normalizeSiteList(joined).join(", ")
    }
    return typeof input === "string" ? normalizeSiteList(input).join(", ") : ""
  }
  const phrase = (input: unknown): string =>
    typeof input === "string" ? normalizePhrase(input) : ""
  return {
    includeSites: sites(raw.includeSites),
    excludeSites: sites(raw.excludeSites),
    exactPhrase: phrase(raw.exactPhrase),
    excludePhrase: phrase(raw.excludePhrase),
  }
}

function normalizePrompt(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim()
}

export type ProviderCredential = {
  apiKey: string
  source: "settings" | "env"
}

/**
 * 读取一个搜索源的 Key：设置页保存的值优先，其次环境变量。
 * 返回值只允许在服务端使用；页面只拿掩码后的前后几位。
 */
export function getProviderCredential(
  workspaceId: WorkspaceId,
  providerId: SearchProviderId
): ProviderCredential | null {
  const row = getDb()
    .prepare(
      "SELECT api_key FROM search_provider_keys WHERE workspace_id = ? AND provider_id = ?"
    )
    .get(workspaceId, providerId) as { api_key?: unknown } | undefined

  if (typeof row?.api_key === "string" && row.api_key.trim()) {
    return { apiKey: row.api_key.trim(), source: "settings" }
  }

  const envKey = process.env[searchProviderById(providerId).envKey]?.trim()
  if (envKey) {
    return { apiKey: envKey, source: "env" }
  }
  return null
}

/** 设置页可见的搜索源状态：不包含完整 Key。 */
export function getProviderStates(workspaceId: WorkspaceId): SearchProviderState[] {
  return SEARCH_PROVIDERS.map((provider) => {
    const credential = getProviderCredential(workspaceId, provider.id)
    return {
      id: provider.id,
      configured: Boolean(credential),
      source: credential?.source ?? null,
      keyPreview: credential ? maskApiKey(credential.apiKey) : null,
    }
  })
}

export function saveProviderKey(
  workspaceId: WorkspaceId,
  providerId: SearchProviderId,
  apiKey: string
): void {
  const trimmed = apiKey.trim()
  if (!trimmed) return
  getDb()
    .prepare(
      `INSERT INTO search_provider_keys (workspace_id, provider_id, api_key, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(workspace_id, provider_id) DO UPDATE SET
         api_key = excluded.api_key,
         updated_at = excluded.updated_at`
    )
    .run(workspaceId, providerId, trimmed, new Date().toISOString())
}

export function clearProviderKey(
  workspaceId: WorkspaceId,
  providerId: SearchProviderId
): void {
  getDb()
    .prepare(
      "DELETE FROM search_provider_keys WHERE workspace_id = ? AND provider_id = ?"
    )
    .run(workspaceId, providerId)
}

/** 没保存过设置时，按工作区领域挑默认提示词（人工智能 ≠ 金融）。 */
function industryOf(workspaceId: string): string {
  const row = getDb()
    .prepare("SELECT industry FROM workspaces WHERE id = ?")
    .get(workspaceId) as { industry: string } | undefined
  return row?.industry ?? "金融"
}

export async function getSettings(workspaceId: WorkspaceId): Promise<AppSettings> {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE workspace_id = ?")
    .get(workspaceId) as { value: string } | undefined
  const defaults = defaultSettingsFor(industryOf(workspaceId))
  if (!row) return { ...defaults, queries: [...defaults.queries] }

  try {
    const parsed = JSON.parse(row.value) as Partial<AppSettings> & {
      searchProvider?: unknown
    }
    return {
      chatModel:
        typeof parsed.chatModel === "string" && parsed.chatModel.trim()
          ? parsed.chatModel.trim().slice(0, 64)
          : defaults.chatModel,
      searchProviders: normalizeProviders(
        parsed.searchProviders ?? parsed.searchProvider,
        defaults.searchProviders
      ),
      queries: normalizeQueries(parsed.queries, defaults.queries),
      searchLang: normalizeLang(parsed.searchLang),
      searchCount: clampInt(parsed.searchCount, 1, 50, defaults.searchCount),
      itemLimit: clampInt(parsed.itemLimit, 30, 120, defaults.itemLimit),
      lookbackDays: clampInt(parsed.lookbackDays, 1, 7, defaults.lookbackDays),
      briefItemLimit: clampInt(
        parsed.briefItemLimit,
        20,
        80,
        defaults.briefItemLimit
      ),
      scheduleEnabled:
        typeof parsed.scheduleEnabled === "boolean"
          ? parsed.scheduleEnabled
          : defaults.scheduleEnabled,
      scheduleTime: normalizeScheduleTime(
        parsed.scheduleTime,
        defaults.scheduleTime
      ),
      scheduleDays: normalizeScheduleDays(
        parsed.scheduleDays,
        defaults.scheduleDays
      ),
      scheduleCatchUp:
        typeof parsed.scheduleCatchUp === "boolean"
          ? parsed.scheduleCatchUp
          : defaults.scheduleCatchUp,
      deepseekSyntax: normalizeSyntax(parsed.deepseekSyntax),
      briefSystemPrompt:
        typeof parsed.briefSystemPrompt === "string" &&
        parsed.briefSystemPrompt.trim()
          ? normalizePrompt(parsed.briefSystemPrompt).slice(0, 4000)
          : defaults.briefSystemPrompt,
      briefUserPrompt:
        typeof parsed.briefUserPrompt === "string" &&
        parsed.briefUserPrompt.includes("{{items}}") &&
        parsed.briefUserPrompt.trim()
          ? normalizePrompt(parsed.briefUserPrompt).slice(0, 8000)
          : defaults.briefUserPrompt,
    }
  } catch {
    return { ...defaults, queries: [...defaults.queries] }
  }
}

export async function saveSettings(
  workspaceId: WorkspaceId,
  next: AppSettings
): Promise<void> {
  const normalized: AppSettings = {
    ...next,
    briefSystemPrompt: normalizePrompt(next.briefSystemPrompt),
    briefUserPrompt: normalizePrompt(next.briefUserPrompt),
  }
  getDb()
    .prepare(
      `INSERT INTO app_settings (workspace_id, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(workspace_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(workspaceId, JSON.stringify(normalized), new Date().toISOString())
}
