"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  isValidSite,
  normalizePhrase,
  normalizeSiteList,
} from "@/lib/deepseek-query"
import {
  MAX_SEARCH_COUNT,
  SEARCH_PROVIDER_IDS,
  isSearchProviderId,
  maskApiKey,
  maxResultsForProviders,
  searchProviderById,
  type SearchProviderId,
} from "@/lib/search-providers"
import {
  clearProviderKey,
  getProviderCredential,
  saveProviderKey,
  saveSettings,
} from "@/lib/server/repositories/settings"
import { logError, logInfo, logWarn } from "@/lib/server/logger"
import {
  getWebhookEndpoint,
  saveWebhookEndpoints,
  type WebhookSaveInput,
} from "@/lib/server/repositories/webhooks"
import { testSearchProvider } from "@/lib/server/search"
import {
  buildTestWebhookMessage,
  resendLatestBrief,
  sendWebhook,
} from "@/lib/server/webhooks"
import { isMaskedValue, maskSecret } from "@/lib/mask"
import { getActiveWorkspace } from "@/lib/server/workspace"
import {
  WEBHOOK_PROVIDER_IDS,
  isWebhookProviderId,
  normalizeWebhookUrl,
  webhookProviderById,
  webhookUrlLooksValid,
  type WebhookProviderId,
} from "@/lib/webhooks"

/** 站点：先归一化成逗号分隔列表，再逐个校验域名；空值表示不限制。 */
function siteListSchema(label: string) {
  return z
    .string()
    .max(400, `${label}最多 400 个字符`)
    .transform((value) => normalizeSiteList(value).join(", "))
    .refine(
      (value) => value === "" || value.split(", ").every(isValidSite),
      `${label}需为域名，例：github.com；多个用逗号或空格分隔`
    )
}

/** 短语：去引号、压空白；空值表示不过滤。 */
function phraseSchema(label: string) {
  return z
    .string()
    .max(200, `${label}最多 200 个字符`)
    .transform((value) => normalizePhrase(value))
    .refine((value) => value.length <= 40, `${label}最多 40 个字`)
}

const deepseekSyntaxSchema = z.object({
  includeSites: siteListSchema("限定站点"),
  excludeSites: siteListSchema("排除站点"),
  exactPhrase: phraseSchema("精确短语"),
  excludePhrase: phraseSchema("排除短语"),
})

const providerIdSchema = z.enum(
  SEARCH_PROVIDER_IDS as [SearchProviderId, ...SearchProviderId[]]
)

const settingsSchema = z.object({
  searchProviders: z
    .array(providerIdSchema)
    .min(1, "至少启用一个搜索源")
    .max(4, "搜索源最多 4 个"),
  chatModel: z
    .string()
    .trim()
    .min(1, "模型名不能为空")
    .max(64)
    .refine(
      (value) => value !== "deepseek-chat",
      "该对话模型不可用，请填写服务端可用的模型标识"
    ),
  queries: z
    .array(
      z
        .string()
        .trim()
        .min(4, "每条检索词至少 4 个字")
        .max(100, "单条检索词最多 100 个字（DeepSeek 还会补 after/lang）")
    )
    .min(1, "至少保留一条检索词")
    .max(8, "检索词最多 8 条"),
  searchLang: z.enum(["zh", "en", "zh,en"]),
  searchCount: z.coerce
    .number()
    .int()
    .min(1, "每条检索词至少取 1 条")
    .max(MAX_SEARCH_COUNT, `每条检索词最多取 ${MAX_SEARCH_COUNT} 条`),
  itemLimit: z.coerce
    .number()
    .int()
    .min(30, "每日情报至少保留 30 条")
    .max(120, "每日情报最多保留 120 条"),
  lookbackDays: z.coerce.number().int().min(1, "回看至少 1 天").max(7, "回看最多 7 天"),
  briefItemLimit: z.coerce
    .number()
    .int()
    .min(20, "日报至少引用 20 条")
    .max(80, "日报最多引用 80 条"),
  scheduleEnabled: z
    .union([z.literal("on"), z.literal("")])
    .transform((value) => value === "on"),
  scheduleTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "运行时间格式应为 HH:mm"),
  scheduleDays: z
    .array(z.coerce.number().int().min(1).max(7))
    .min(1, "至少选择一个运行日")
    .max(7),
  scheduleCatchUp: z
    .union([z.literal("on"), z.literal("")])
    .transform((value) => value === "on"),
  deepseekSyntax: deepseekSyntaxSchema,
  briefSystemPrompt: z
    .string()
    .trim()
    .min(10, "系统提示词至少 10 个字")
    .max(4000, "系统提示词最多 4000 个字"),
  briefUserPrompt: z
    .string()
    .trim()
    .min(20, "用户提示词至少 20 个字")
    .max(8000, "用户提示词最多 8000 个字")
    .refine((value) => value.includes("{{items}}"), "用户提示词必须包含 {{items}}"),
})

export type SettingsActionState = {
  ok: boolean
  error?: string
  savedAt?: string
  /** 每次保存都变化，用来清空输入框里的临时 Key。 */
  savedToken?: string
}

type ProviderKeyPlan = {
  id: SearchProviderId
  action: "keep" | "clear" | "set"
  apiKey?: string
}

export async function saveSettingsAction(
  _previous: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const rawQueries = String(formData.get("queries") ?? "")
  const queries = Array.from(
    new Set(
      rawQueries
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  )

  const parsed = settingsSchema.safeParse({
    searchProviders: Array.from(
      new Set(formData.getAll("searchProviders").map(String))
    ),
    chatModel: formData.get("chatModel"),
    queries,
    searchLang: formData.get("searchLang"),
    searchCount: formData.get("searchCount"),
    itemLimit: formData.get("itemLimit"),
    lookbackDays: formData.get("lookbackDays"),
    briefItemLimit: formData.get("briefItemLimit"),
    scheduleEnabled: formData.get("scheduleEnabled") ?? "",
    scheduleTime: formData.get("scheduleTime"),
    scheduleDays: formData.getAll("scheduleDays").map(String),
    scheduleCatchUp: formData.get("scheduleCatchUp") ?? "",
    deepseekSyntax: {
      includeSites: String(formData.get("deepseekIncludeSites") ?? ""),
      excludeSites: String(formData.get("deepseekExcludeSites") ?? ""),
      exactPhrase: String(formData.get("deepseekExactPhrase") ?? ""),
      excludePhrase: String(formData.get("deepseekExcludePhrase") ?? ""),
    },
    briefSystemPrompt: formData.get("briefSystemPrompt"),
    briefUserPrompt: formData.get("briefUserPrompt"),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "设置项不合法",
    }
  }

  const searchProviders = SEARCH_PROVIDER_IDS.filter((id) =>
    parsed.data.searchProviders.includes(id)
  )
  const maxResults = maxResultsForProviders(searchProviders)
  if (parsed.data.searchCount > maxResults) {
    return {
      ok: false,
      error: `当前启用的搜索源单次最多取 ${maxResults} 条`,
    }
  }

  const providerKeys = SEARCH_PROVIDER_IDS.map((id) => ({
    id,
    apiKey: String(formData.get(`providerKey_${id}`) ?? "").trim(),
  }))
  const tooLong = providerKeys.find((item) => item.apiKey.length > 512)
  if (tooLong) {
    return {
      ok: false,
      error: `${searchProviderById(tooLong.id).name} 的 API Key 过长`,
    }
  }

  try {
    const workspace = await getActiveWorkspace()

    const webhookInputs: WebhookSaveInput[] = WEBHOOK_PROVIDER_IDS.map((provider) => {
      const url = normalizeWebhookUrl(
        String(formData.get(`webhookUrl_${provider}`) ?? "")
      )
      const saved = getWebhookEndpoint(workspace.id, provider)
      const raw = String(formData.get(`webhookSecret_${provider}`) ?? "").trim()
      // 页面回显的是掩码：原样提交 = 没改；留空 = 也没改。
      const secretTyped =
        !raw || isMaskedValue(raw, saved?.secret ?? "") ? "" : raw
      const enabled = formData.get(`webhookEnabled_${provider}`) === "on"
      return {
        provider,
        url,
        secret: secretTyped || null,
        enabled,
      }
    })

    for (const input of webhookInputs) {
      const meta = webhookProviderById(input.provider)
      if (input.url && !webhookUrlLooksValid(input.url)) {
        return {
          ok: false,
          error: `${meta.name} 的 Webhook 地址需以 https:// 开头且可解析`,
        }
      }
      if (input.enabled && !input.url) {
        return { ok: false, error: `开启${meta.name}推送前请先填 Webhook 地址` }
      }
      if (input.secret && input.secret.length > 200) {
        return { ok: false, error: `${meta.name} 的密钥过长` }
      }
    }

    const plans: ProviderKeyPlan[] = providerKeys.map((item) => {
      const current = getProviderCredential(workspace.id, item.id)
      if (!item.apiKey) {
        // 输入框清空并保存 = 删除已保存的 Key；环境变量不会被页面删除。
        return {
          id: item.id,
          action: current?.source === "settings" ? "clear" : "keep",
        }
      }
      if (
        current &&
        (item.apiKey === maskApiKey(current.apiKey) ||
          item.apiKey === current.apiKey)
      ) {
        // 输入框里原样提交的掩码或完整值都表示“未改 Key”。
        return { id: item.id, action: "keep" }
      }
      if (item.apiKey.includes("••")) {
        throw new Error(
          `${searchProviderById(item.id).name} 的 Key 是掩码，请重新填写完整 Key`
        )
      }
      return { id: item.id, action: "set", apiKey: item.apiKey }
    })

    for (const plan of plans) {
      if (plan.action === "clear") {
        clearProviderKey(workspace.id, plan.id)
      } else if (plan.action === "set" && plan.apiKey) {
        saveProviderKey(workspace.id, plan.id, plan.apiKey)
      }
    }

    saveWebhookEndpoints(workspace.id, webhookInputs)

    await saveSettings(workspace.id, { ...parsed.data, searchProviders })
    revalidatePath("/settings")
    revalidatePath("/admin")
    return {
      ok: true,
      savedAt: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      savedToken: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存设置失败"
    logWarn("settings.save_failed", { message: message.slice(0, 240) })
    return { ok: false, error: message }
  }
}

export type ProviderKeyRevealState = {
  ok: boolean
  apiKey?: string
  error?: string
}

/**
 * 用户点眼睛时才返回完整 Key；初始页面只下发掩码。
 * 这是本地单租户版本，访问者与设置页一致；上生产前需要补鉴权与审计。
 */
export async function revealProviderKeyAction(
  providerId: string
): Promise<ProviderKeyRevealState> {
  if (!isSearchProviderId(providerId)) {
    return { ok: false, error: "未知的搜索源" }
  }

  try {
    const workspace = await getActiveWorkspace()
    const credential = getProviderCredential(workspace.id, providerId)
    if (!credential) {
      return { ok: false, error: "还没有配置 Key" }
    }
    // 完整 Key 只在这里下发一次，留一条审计线索（不带内容）。
    logInfo("settings.key_revealed", {
      workspace: workspace.id,
      provider: providerId,
      source: credential.source,
    })
    return { ok: true, apiKey: credential.apiKey }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "读取 Key 失败",
    }
  }
}

export type ProviderTestState = {
  ok: boolean
  message: string
}

/**
 * 搜索源连通性测试：优先测输入框里的 Key，没填则测已保存的 Key 或环境变量。
 * 只读调用，不写库、不触发采集。
 */
export async function testSearchProviderAction(input: {
  providerId: string
  apiKey?: string
}): Promise<ProviderTestState> {
  if (!isSearchProviderId(input.providerId)) {
    return { ok: false, message: "未知的搜索源" }
  }

  const meta = searchProviderById(input.providerId)
  const typedKey = (input.apiKey ?? "").trim()

  try {
    const workspace = await getActiveWorkspace()
    const credential = typedKey
      ? { apiKey: typedKey }
      : getProviderCredential(workspace.id, input.providerId)

    if (!credential) {
      return {
        ok: false,
        message: `还没有配置 Key；请填写后重试，或在服务端设置 ${meta.envKey}`,
      }
    }

    const result = await testSearchProvider(
      input.providerId,
      credential.apiKey,
      workspace.id
    )
    return {
      ok: true,
      message: `连接成功 · ${result.count} 条结果 · ${(result.ms / 1000).toFixed(1)}s`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      message: `连接失败：${message}`.slice(0, 240),
    }
  }
}

export type WebhookTestState = {
  ok: boolean
  message: string
}

/**
 * 「测试发送」：优先用输入框里**当前**的地址与密钥，没有改动时回落到已保存的配置。
 *
 * 早期版本只读已保存配置，用户粘完密钥直接点测试就会用到旧值（通常是空密钥），
 * 钉钉/飞书会回「签名不匹配」，非常迷惑。现在跟页面上的输入框保持一致。
 */
export async function testWebhookAction(input: {
  provider: string
  url?: string
  secret?: string
}): Promise<WebhookTestState> {
  const { provider } = input
  if (!isWebhookProviderId(provider)) {
    return { ok: false, message: "未知的推送平台" }
  }
  const meta = webhookProviderById(provider)

  const typedUrl = normalizeWebhookUrl(input.url ?? "")
  if (typedUrl && !webhookUrlLooksValid(typedUrl)) {
    return { ok: false, message: `${meta.name} 的 Webhook 地址需以 http(s):// 开头` }
  }
  const rawSecret = (input.secret ?? "").trim()

  try {
    const workspace = await getActiveWorkspace()
    const saved = getWebhookEndpoint(workspace.id, provider as WebhookProviderId)

    const url = typedUrl || saved?.url || ""
    // 输入框留空、或提交的是页面回显的掩码 = 沿用已保存的密钥。
    const masked = isMaskedValue(rawSecret, saved?.secret ?? "")
    const secret = rawSecret && !masked ? rawSecret : saved?.secret || ""

    if (!url) {
      return { ok: false, message: "请先填写 Webhook 地址" }
    }

    await sendWebhook(
      { provider: provider as WebhookProviderId, url, secret, enabled: true },
      buildTestWebhookMessage(workspace)
    )
    logInfo("settings.webhook_tested", {
      workspace: workspace.id,
      provider,
      source: typedUrl || (rawSecret && !masked) ? "form" : "saved",
    })
    return { ok: true, message: "测试消息已发送，请到群里确认" }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logWarn("settings.webhook_test_failed", {
      provider,
      message: message.slice(0, 240),
    })
    return { ok: false, message: `发送失败：${message}`.slice(0, 300) }
  }
}

export type WebhookSecretRevealState = {
  ok: boolean
  secret?: string
  error?: string
}

/** 眼睛按钮：按需取完整加签密钥，页面初始只拿掩码。 */
export async function revealWebhookSecretAction(
  provider: string
): Promise<WebhookSecretRevealState> {
  if (!isWebhookProviderId(provider)) {
    return { ok: false, error: "未知的推送平台" }
  }
  try {
    const workspace = await getActiveWorkspace()
    const endpoint = getWebhookEndpoint(workspace.id, provider as WebhookProviderId)
    if (!endpoint?.secret) {
      return { ok: false, error: "这个平台还没有保存密钥" }
    }
    logInfo("settings.webhook_secret_revealed", {
      workspace: workspace.id,
      provider,
    })
    return { ok: true, secret: endpoint.secret }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "读取密钥失败",
    }
  }
}

export type ResendBriefState = {
  ok: boolean
  message: string
}

/**
 * 手动重推最近一期日报：只读已落库的日报与情报，不再跑采集。
 * 适合改完加签密钥或想重发一次的时候用。
 */
export async function resendBriefAction(): Promise<ResendBriefState> {
  try {
    const workspace = await getActiveWorkspace()
    const { date, deliveries } = await resendLatestBrief(workspace)

    if (deliveries.length === 0) {
      return { ok: false, message: "还没有开启任何推送平台" }
    }

    const succeeded = deliveries.filter((item) => item.ok)
    const failed = deliveries.filter((item) => !item.ok)
    if (failed.length === 0) {
      logInfo("settings.brief_resent", {
        workspace: workspace.id,
        date,
        providers: succeeded.map((item) => item.provider),
      })
      return { ok: true, message: `已推送 ${date} 日报到 ${succeeded.length} 个群` }
    }

    return {
      ok: false,
      message: `${succeeded.length} 个成功、${failed.length} 个失败：${failed[0].error ?? "未知错误"}`.slice(
        0,
        240
      ),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logWarn("settings.brief_resend_failed", { message: message.slice(0, 240) })
    return { ok: false, message: `推送失败：${message}`.slice(0, 240) }
  }
}
