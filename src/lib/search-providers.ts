/**
 * 搜索源清单：客户端设置页与服务端适配器共用。
 *
 * 这里只放公开元数据；API Key 只从服务端设置或环境变量读取，
 * 不进入客户端 bundle，也不出现在 AppSettings 里。
 */

export type SearchProviderId = "deepseek" | "bocha" | "metaso" | "tavily"

/** 设置页可见的搜索源状态；只含末四位，不含完整 Key。 */
export type SearchProviderState = {
  id: SearchProviderId
  configured: boolean
  source: "settings" | "env" | null
  /** 已配置时的掩码，例如 sk-t••••••1234；不含完整 Key。 */
  keyPreview: string | null
}

export type SearchProviderMeta = {
  id: SearchProviderId
  /** 设置页展示名 */
  name: string
  /** 本地品牌图标（public/providers 下） */
  icon: string
  /** 卡片上展示的一句话介绍：告诉客户这是什么源 */
  description: string
  /** tooltip 里的补充：什么时候选它、有什么限制 */
  hint: string
  /** 服务商单次请求上限；系统还会统一压到 50 */
  maxResults: number
  /** 实际请求地址，可在环境变量里覆盖 */
  endpoint: string
  /** 覆盖请求地址的环境变量 */
  endpointEnv: string
  /** 没有在设置里保存 Key 时的兜底环境变量 */
  envKey: string
  /** 官方文档 */
  docsUrl: string
}

export const SEARCH_PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek Search",
    icon: "/providers/deepseek.png",
    description: "DeepSeek 官方搜索接口，中文资讯为主，支持 site / lang / after 语法。",
    hint: "默认搜索源。支持 site: / -site: / “精确短语” / lang / after 等操作符，单次最多 50 条。",
    maxResults: 50,
    endpoint: "https://api.deepseek.com/v1/tools/search",
    endpointEnv: "DEEPSEEK_SEARCH_URL",
    envKey: "DEEPSEEK_API_KEY",
    docsUrl: "https://api-docs.deepseek.com/guides/search/",
  },
  {
    id: "bocha",
    name: "博查 Bocha",
    icon: "/providers/bocha.png",
    description: "国内网页搜索 API，覆盖主流媒体与财经门户，查国内动态靠它。",
    hint: "国内资讯密度高，适合政策、券商研报、财经媒体；不支持 DeepSeek 那套检索语法，单次最多 50 条。",
    maxResults: 50,
    endpoint: "https://api.bochaai.com/v1/web-search",
    endpointEnv: "BOCHA_SEARCH_URL",
    envKey: "BOCHA_API_KEY",
    docsUrl: "https://open.bochaai.com",
  },
  {
    id: "metaso",
    name: "秘塔 Metaso",
    icon: "/providers/metaso.png",
    description: "秘塔 AI 搜索，偏研究与长文，返回带摘要的网页列表。",
    hint: "适合找研究报告、深度长文；单次最多 50 条（源上限 100，系统统一压到 50）。",
    maxResults: 100,
    endpoint: "https://metaso.cn/api/v1/search",
    endpointEnv: "METASO_SEARCH_URL",
    envKey: "METASO_API_KEY",
    docsUrl: "https://metaso.cn/search-api/playground",
  },
  {
    id: "tavily",
    name: "Tavily",
    icon: "/providers/tavily.png",
    description: "面向 AI 应用的搜索 API，英文与海外信源更全，适合跟踪全球动态。",
    hint: "英文站点覆盖更好；单次最多 20 条，启用后会把每条检索词的上限一起压到 20。",
    maxResults: 20,
    endpoint: "https://api.tavily.com/search",
    endpointEnv: "TAVILY_SEARCH_URL",
    envKey: "TAVILY_API_KEY",
    docsUrl: "https://docs.tavily.com/documentation/api-reference/endpoint/search",
  },
] as const satisfies readonly SearchProviderMeta[]

export const SEARCH_PROVIDER_IDS = SEARCH_PROVIDERS.map(
  (provider) => provider.id
) as SearchProviderId[]

/** 本系统统一上限：单次请求最多 50 条。 */
export const MAX_SEARCH_COUNT = 50

/** 掩码只露前 4 位与后 4 位；客户端与服务端共用同一套算法。 */
export { maskSecret as maskApiKey } from "@/lib/mask"

export function isSearchProviderId(value: unknown): value is SearchProviderId {
  return (
    typeof value === "string" &&
    SEARCH_PROVIDERS.some((provider) => provider.id === value)
  )
}

export function searchProviderById(
  id: string | null | undefined
): SearchProviderMeta {
  return (
    SEARCH_PROVIDERS.find((provider) => provider.id === id) ?? SEARCH_PROVIDERS[0]
  )
}

/** 当前搜索源实际允许的条数：系统上限与源上限取小。 */
export function maxResultsForProvider(id: SearchProviderId): number {
  return Math.min(MAX_SEARCH_COUNT, searchProviderById(id).maxResults)
}

/** 多选时取所有启用源里最严格的上限；未启用任何源时按系统上限。 */
export function maxResultsForProviders(ids: SearchProviderId[]): number {
  if (ids.length === 0) return MAX_SEARCH_COUNT
  return Math.min(...ids.map(maxResultsForProvider))
}

export function searchProviderNames(ids: SearchProviderId[]): string[] {
  return ids.map((id) => searchProviderById(id).name)
}
