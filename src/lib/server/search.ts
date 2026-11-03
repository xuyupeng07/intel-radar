import "server-only"

import {
  buildDeepSeekQuery,
  type DeepSeekSyntax,
} from "@/lib/deepseek-query"
import {
  maxResultsForProvider,
  searchProviderById,
  type SearchProviderId,
  type SearchProviderMeta,
} from "@/lib/search-providers"
import { getProviderCredential } from "@/lib/server/repositories/settings"
import type { SearchLang } from "@/lib/settings"
import { dateMinusDays, todayInShanghai } from "@/lib/server/time"
import type { WorkspaceId } from "@/lib/workspaces"

/** 所有搜索源统一成这一种结果，采集管线只认它。 */
export type SearchResult = {
  title: string
  url: string
  snippet: string
  summary: string
  content?: string
  site_name: string | null
  site_icon: string | null
  date: string | null
  authority: number
  rerank_score: number
  /** 采集管线填入：这条结果来自哪些搜索源。 */
  providers?: string[]
  /** 采集管线填入：相似标题合并掉的重复条数。 */
  duplicateCount?: number
}

export type SearchRequest = {
  workspaceId: WorkspaceId
  providerId: SearchProviderId
  query: string
  count: number
  lookbackDays: number
  lang: SearchLang
  after: string
  /** DeepSeek 专属语法；其他源忽略。 */
  syntax?: DeepSeekSyntax
  /** 单个检索请求的超时，采集会按剩余预算收紧。 */
  timeoutMs?: number
}

type AdapterRequest = Omit<SearchRequest, "workspaceId" | "providerId">

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** 单次检索超时：默认 45s，采集阶段按剩余预算收紧，最少 5s。 */
function requestTimeout(request: AdapterRequest): number {
  const value = request.timeoutMs
  if (typeof value !== "number" || !Number.isFinite(value)) return 45_000
  return Math.max(5_000, Math.min(45_000, Math.round(value)))
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function faviconFor(url: string): string | null {
  const host = hostOf(url)
  return host ? `https://${host}/favicon.ico` : null
}

function truncate(value: string, max = 240): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max)
}

function dateValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function positionScore(index: number, start = 2.8, step = 0.12): number {
  return Math.max(1.1, start - index * step)
}

async function postJson<T>(
  label: string,
  url: string,
  apiKey: string,
  body: unknown,
  timeoutMs = 45_000
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${truncate(text)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`${label} 返回了非 JSON 内容：${truncate(text, 160)}`)
  }
}

type DeepSeekItem = {
  title?: string
  url?: string
  snippet?: string
  summary?: string
  content?: string
  site_name?: string | null
  site_icon?: string | null
  date?: string | null
  authority?: number
  rerank_score?: number
}

async function searchDeepSeek(
  meta: SearchProviderMeta,
  apiKey: string,
  request: AdapterRequest
): Promise<SearchResult[]> {
  const endpoint = process.env[meta.endpointEnv]?.trim() || meta.endpoint
  const data = await postJson<{ results?: DeepSeekItem[] }>(
    meta.name,
    endpoint,
    apiKey,
    {
      query: buildDeepSeekQuery(request.query, {
        syntax: request.syntax,
        lang: request.lang,
        after: request.after,
      }),
      count: clamp(request.count, 1, maxResultsForProvider(meta.id)),
      need_content: false,
    },
    requestTimeout(request)
  )

  return (data.results ?? []).map((item) => {
    const url = item.url ?? ""
    return {
      title: item.title ?? url,
      url,
      snippet: item.snippet ?? "",
      summary: item.summary ?? item.snippet ?? "",
      content: item.content || undefined,
      site_name: item.site_name ?? (hostOf(url) || null),
      site_icon: item.site_icon ?? null,
      date: item.date ?? null,
      authority: numberValue(item.authority, -1),
      rerank_score: numberValue(item.rerank_score, 0),
    }
  })
}

type BochaItem = {
  name?: string
  url?: string
  snippet?: string
  summary?: string
  siteName?: string | null
  siteIcon?: string | null
  datePublished?: string | null
}

async function searchBocha(
  meta: SearchProviderMeta,
  apiKey: string,
  request: AdapterRequest
): Promise<SearchResult[]> {
  const endpoint = process.env[meta.endpointEnv]?.trim() || meta.endpoint
  const freshness =
    request.lookbackDays <= 1
      ? "oneDay"
      : request.lookbackDays <= 7
        ? "oneWeek"
        : "noLimit"

  const data = await postJson<{
    code?: number
    msg?: string | null
    data?: { webPages?: { value?: BochaItem[] } }
  }>(
    meta.name,
    endpoint,
    apiKey,
    {
      query: request.query,
      count: clamp(request.count, 1, maxResultsForProvider(meta.id)),
      freshness,
      summary: true,
    },
    requestTimeout(request)
  )

  if (data.code && data.code !== 200) {
    throw new Error(`博查 ${data.code}: ${data.msg ?? "请求失败"}`)
  }

  return (data.data?.webPages?.value ?? []).map((item, index) => {
    const url = item.url ?? ""
    return {
      title: item.name ?? url,
      url,
      snippet: item.snippet ?? "",
      summary: item.summary ?? item.snippet ?? "",
      site_name: item.siteName ?? hostOf(url) ?? null,
      site_icon: item.siteIcon ?? null,
      date: item.datePublished ?? null,
      authority: 2,
      rerank_score: positionScore(index),
    }
  })
}

type MetasoItem = {
  title?: string
  link?: string
  snippet?: string
  score?: string | number | null
  date?: string | null
}

function metasoScore(value: MetasoItem["score"], index: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(3, Math.max(0, value))
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase()
    if (normalized.includes("high")) return 2.6
    if (normalized.includes("medium")) return 1.9
    if (normalized.includes("low")) return 1.2
  }
  return positionScore(index, 2.7, 0.1)
}

async function searchMetaso(
  meta: SearchProviderMeta,
  apiKey: string,
  request: AdapterRequest
): Promise<SearchResult[]> {
  const endpoint = process.env[meta.endpointEnv]?.trim() || meta.endpoint
  const data = await postJson<{
    webpages?: MetasoItem[]
    data?: { webpages?: MetasoItem[] }
  }>(
    meta.name,
    endpoint,
    apiKey,
    {
      q: request.query,
      scope: "webpage",
      includeSummary: true,
      includeRawContent: false,
      size: String(clamp(request.count, 1, maxResultsForProvider(meta.id))),
      conciseSnippet: false,
    },
    requestTimeout(request)
  )

  const items = data.webpages ?? data.data?.webpages ?? []
  return items.map((item, index) => {
    const url = item.link ?? ""
    return {
      title: item.title ?? url,
      url,
      snippet: item.snippet ?? "",
      summary: item.snippet ?? "",
      site_name: hostOf(url) || null,
      site_icon: faviconFor(url),
      date: dateValue(item.date),
      authority: 2,
      rerank_score: metasoScore(item.score, index),
    }
  })
}

type TavilyItem = {
  title?: string
  url?: string
  content?: string
  score?: number
  published_date?: string | null
  favicon?: string | null
}

async function searchTavily(
  meta: SearchProviderMeta,
  apiKey: string,
  request: AdapterRequest
): Promise<SearchResult[]> {
  const endpoint = process.env[meta.endpointEnv]?.trim() || meta.endpoint
  const timeRange =
    request.lookbackDays <= 1
      ? "day"
      : request.lookbackDays <= 7
        ? "week"
        : "month"

  const data = await postJson<{ results?: TavilyItem[] }>(
    meta.name,
    endpoint,
    apiKey,
    {
      query: request.query,
      max_results: clamp(request.count, 1, maxResultsForProvider(meta.id)),
      search_depth: "basic",
      topic: "general",
      include_answer: false,
      include_raw_content: false,
      include_published_date: true,
      time_range: timeRange,
    },
    requestTimeout(request)
  )

  return (data.results ?? []).map((item, index) => {
    const url = item.url ?? ""
    const content = item.content ?? ""
    return {
      title: item.title ?? url,
      url,
      snippet: truncate(content, 220),
      summary: content,
      site_name: hostOf(url) || null,
      site_icon: item.favicon ?? faviconFor(url),
      date: item.published_date ?? null,
      authority: 2,
      rerank_score:
        typeof item.score === "number" && Number.isFinite(item.score)
          ? Math.min(3, Math.max(0, item.score * 3))
          : positionScore(index, 2.4, 0.1),
    }
  })
}

async function searchWithKey(
  meta: SearchProviderMeta,
  apiKey: string,
  request: AdapterRequest
): Promise<SearchResult[]> {
  if (!apiKey.trim()) {
    throw new Error(`${meta.name} 没有可用的 API Key`)
  }

  switch (meta.id) {
    case "deepseek":
      return searchDeepSeek(meta, apiKey, request)
    case "bocha":
      return searchBocha(meta, apiKey, request)
    case "metaso":
      return searchMetaso(meta, apiKey, request)
    case "tavily":
      return searchTavily(meta, apiKey, request)
  }
}

/** 按当前工作区设置里的搜索源执行一次检索。 */
export async function searchWithProvider(
  request: SearchRequest
): Promise<SearchResult[]> {
  const meta = searchProviderById(request.providerId)
  const credential = getProviderCredential(request.workspaceId, meta.id)
  if (!credential) {
    throw new Error(
      `${meta.name} 还没有配置 API Key，请到「设置 → 搜索源」填写，或在服务端设置 ${meta.envKey}`
    )
  }

  return searchWithKey(meta, credential.apiKey, request)
}

/** 设置页的「测试连接」：只取 3 条，不写入任何数据。 */
export async function testSearchProvider(
  providerId: SearchProviderId,
  apiKey: string,
  workspaceId: WorkspaceId
): Promise<{ count: number; ms: number }> {
  const started = Date.now()
  const meta = searchProviderById(providerId)
  const results = await searchWithKey(meta, apiKey, {
    query: "人工智能 最新进展",
    count: 3,
    lookbackDays: 7,
    lang: "zh",
    after: dateMinusDays(todayInShanghai(), 7),
  })
  return { count: results.length, ms: Date.now() - started }
}
