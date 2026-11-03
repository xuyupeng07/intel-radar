import "server-only"

import { createHmac } from "node:crypto"

import type { Brief, IntelItem } from "@/lib/intel"
import {
  webhookProviderById,
  type WebhookMessage,
  type WebhookProviderId,
} from "@/lib/webhooks"
import type { Workspace } from "@/lib/workspaces"
import { logInfo, logWarn } from "@/lib/server/logger"
import {
  listEnabledWebhookEndpoints,
  type WebhookEndpoint,
} from "@/lib/server/repositories/webhooks"
import { latestBrief } from "@/lib/server/repositories/briefs"
import { listItems } from "@/lib/server/repositories/items"

/**
 * 三个平台的群机器人 webhook。
 *
 * 都是「一个 HTTPS POST + 平台固定 JSON」，官方 SDK 面向的是应用级 API
 * （需要 corpId / appKey / access_token 换票），对群机器人反而更重；
 * 这里直接用官方文档给的消息格式与签名算法，只依赖 node:crypto。
 *
 * 参考：
 * - 企业微信 https://developer.work.weixin.qq.com/document/path/91770
 * - 钉钉     https://open.dingtalk.com/document/orgapp/custom-robot-access
 * - 飞书     https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
 */

const REQUEST_TIMEOUT_MS = 10_000
/** 企业微信 markdown 上限 4096 字节，留一点余量。 */
const WECOM_BYTE_LIMIT = 3800
/** 钉钉 markdown 上限 20000 字节，留余量。 */
const DINGTALK_BYTE_LIMIT = 18_000
/** 卡片里列出多少条相关新闻。 */
const SOURCE_LIMIT = 12

function hmacBase64(key: string, data: string): string {
  return createHmac("sha256", key).update(data, "utf8").digest("base64")
}

/**
 * 钉钉加签：`timestamp\nsecret` 作为签名内容，secret 作 key，
 * 先 HMAC-SHA256 再 Base64，最后进 URL query（由 URLSearchParams 编码一次）。
 */
export function dingTalkSignature(
  secret: string,
  timestampMs: number
): { timestamp: string; sign: string } {
  const timestamp = String(timestampMs)
  return {
    timestamp,
    sign: hmacBase64(secret, `${timestamp}\n${secret}`),
  }
}

/**
 * 飞书签名：`timestamp\nsecret` 作 HMAC 的 key，消息为空串；时间戳单位是秒，
 * timestamp 与 sign 放在 **请求体** 里（放 URL 上会验签失败）。
 */
export function feishuSignature(
  secret: string,
  timestampSec: number
): { timestamp: string; sign: string } {
  const timestamp = String(timestampSec)
  return {
    timestamp,
    sign: hmacBase64(`${timestamp}\n${secret}`, ""),
  }
}

function truncateBytes(text: string, limit: number): string {
  const buffer = Buffer.from(text, "utf8")
  if (buffer.length <= limit) return text
  // 按字节截断后去掉可能被切断的半个字符。
  return new TextDecoder("utf-8", { fatal: false })
    .decode(buffer.subarray(0, limit))
    .replace(/\uFFFD$/, "")
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8")
}

/**
 * 把日报拼成群消息里的 markdown。
 * 先放标题 / 导语 / 各主题小节，再按剩余字节塞「相关新闻」，最后留位给完整日报链接。
 * 企业微信只有 4096 字节，这一层必须按预算裁剪，不能直接整篇塞进去。
 */
function composeMarkdown(message: WebhookMessage, limit: number): string {
  const tail = message.link
    ? `\n\n[${message.linkLabel ?? "查看完整日报"}](${message.link})`
    : ""
  const tailBytes = byteLength(tail)
  const budget = Math.max(400, limit - tailBytes)

  let body = [`### ${message.title}`, ...message.lines.filter(Boolean)].join("\n\n")

  for (const section of message.sections ?? []) {
    const heading = section.heading.trim()
    const text = section.text.trim()
    if (!heading || !text) continue
    const chunk = `\n\n**${heading}**\n${text}`
    if (byteLength(body) + byteLength(chunk) > budget) {
      body = `${truncateBytes(body, Math.max(200, budget - 8))}…`
      break
    }
    body += chunk
  }

  const sourceLines: string[] = []
  for (const line of message.sources ?? []) {
    const block = `\n\n**相关新闻**\n${[...sourceLines, line].join("\n")}`
    if (byteLength(body) + byteLength(block) > budget) break
    sourceLines.push(line)
  }
  if (sourceLines.length > 0) {
    body += `\n\n**相关新闻**\n${sourceLines.join("\n")}`
    if (message.sourceNote) body += `\n${message.sourceNote}`
  }

  return `${body}${tail}`
}

/**
 * 企业微信 markdown 上限 4096 字节。整篇日报（约 6.5KB）装不下，
 * 但也不该把正文截断、只把来源挪走——那会丢掉最后一个小节。
 * 这里按「标题+导语 / 每个主题小节 / 情报洞察 / 相关新闻 / 链接」整块装箱，
 * 每箱不超过 3800 字节，块与块之间不切开；通常正好两条。
 */
function wecomBodies(message: WebhookMessage): unknown[] {
  const blocks: string[] = []

  const title = `### ${message.title}`
  const lead = message.lines.filter(Boolean).join("\n")
  blocks.push(lead ? `${title}\n\n${lead}` : title)

  for (const section of message.sections ?? []) {
    const heading = section.heading.trim()
    const text = section.text.trim()
    if (heading && text) blocks.push(`**${heading}**\n${text}`)
  }

  if (message.sources && message.sources.length > 0) {
    const note = message.sourceNote ? `\n${message.sourceNote}` : ""
    blocks.push(`**相关新闻**\n${message.sources.join("\n")}${note}`)
  }

  if (message.link) {
    blocks.push(`[${message.linkLabel ?? "查看完整日报"}](${message.link})`)
  }

  const messages: string[] = []
  let current = ""

  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block
    if (byteLength(next) <= WECOM_BYTE_LIMIT) {
      current = next
      continue
    }
    if (current) {
      messages.push(current)
      current = ""
    }
    if (byteLength(block) <= WECOM_BYTE_LIMIT) {
      current = block
      continue
    }
    // 单个小节就超过上限（极少见）：只能截断，但保留省略号提示。
    messages.push(`${truncateBytes(block, WECOM_BYTE_LIMIT - 3)}…`)
  }
  if (current) messages.push(current)

  return messages.map((content) => ({
    msgtype: "markdown",
    markdown: { content },
  }))
}

function dingtalkBody(message: WebhookMessage): unknown {
  return {
    msgtype: "markdown",
    markdown: {
      title: message.title,
      text: composeMarkdown(message, DINGTALK_BYTE_LIMIT),
    },
    at: { isAtAll: false },
  }
}

function feishuBody(message: WebhookMessage): Record<string, unknown> {
  const elements: Record<string, unknown>[] = []

  const lead = message.lines.filter(Boolean).join("\n")
  if (lead) {
    elements.push({ tag: "div", text: { tag: "lark_md", content: lead } })
  }

  for (const section of message.sections ?? []) {
    const heading = section.heading.trim()
    const text = section.text.trim()
    if (!heading || !text) continue
    elements.push({
      tag: "div",
      text: { tag: "lark_md", content: `**${heading}**\n${text.slice(0, 800)}` },
    })
  }

  if (message.sources && message.sources.length > 0) {
    elements.push({ tag: "hr" })
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**相关新闻**\n${message.sources.join("\n")}`,
      },
    })
    if (message.sourceNote) {
      elements.push({
        tag: "note",
        elements: [{ tag: "plain_text", content: message.sourceNote }],
      })
    }
  }

  if (message.link) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: message.linkLabel ?? "查看详情" },
          type: "primary",
          url: message.link,
        },
      ],
    })
  }
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: "blue",
        title: { tag: "plain_text", content: message.title },
      },
      elements,
    },
  }
}

/** 平台统一用 errcode / code = 0 表示成功；非 0 时把原始报文抛给上层。 */
/** 常见错误码翻成人话：原始报文太长，直接甩给用户看不懂。 */
const ERROR_HINTS: Record<string, Record<string, string>> = {
  dingtalk: {
    "310000": "钉钉签名不匹配：核对「加签密钥」是否与机器人后台一致（密钥留空会沿用已保存的值）",
    "300001": "钉钉 access_token 无效，请重新复制 Webhook 地址",
  },
  wecom: {
    "93000": "企业微信 Webhook key 无效，请重新复制地址",
    "45009": "企业微信推送频率超限（20 条/分钟），稍后再试",
  },
  feishu: {
    "19021": "飞书签名校验失败：确认「签名密钥」与机器人后台一致",
    "19024": "飞书机器人不存在或已删除，请重新复制地址",
  },
}

function assertSuccess(provider: WebhookProviderId, body: unknown): void {
  const name = webhookProviderById(provider).name
  if (!body || typeof body !== "object") {
    throw new Error(`${name} 返回了非 JSON 内容`)
  }
  const record = body as Record<string, unknown>
  const code = record.errcode ?? record.code ?? record.StatusCode
  if (code === undefined || code === null) {
    // 少数网关只回 200 空体，视为成功。
    return
  }
  if (Number(code) !== 0) {
    const message =
      record.errmsg ?? record.msg ?? record.StatusMessage ?? "未知错误"
    const hint = ERROR_HINTS[provider]?.[String(code)]
    throw new Error(
      `${name} ${String(code)}：${hint ?? String(message).slice(0, 160)}`
    )
  }
}

export async function sendWebhook(
  endpoint: WebhookEndpoint,
  message: WebhookMessage
): Promise<void> {
  const meta = webhookProviderById(endpoint.provider)
  let url: URL
  try {
    url = new URL(endpoint.url)
  } catch {
    throw new Error(`${meta.name} 的 Webhook 地址不是合法 URL`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${meta.name} 的 Webhook 地址必须是 http(s)`)
  }

  const secret = endpoint.secret.trim()
  const bodies: Record<string, unknown>[] = []

  if (endpoint.provider === "wecom") {
    bodies.push(...(wecomBodies(message) as Record<string, unknown>[]))
  } else if (endpoint.provider === "dingtalk") {
    bodies.push(dingtalkBody(message) as Record<string, unknown>)
    if (secret) {
      const { timestamp, sign } = dingTalkSignature(secret, Date.now())
      // URLSearchParams 负责一次 percent-encode，与官方要求的 urlEncode 等价。
      url.searchParams.set("timestamp", timestamp)
      url.searchParams.set("sign", sign)
    }
  } else {
    const body = feishuBody(message)
    if (secret) {
      const { timestamp, sign } = feishuSignature(secret, Math.floor(Date.now() / 1000))
      body.timestamp = timestamp
      body.sign = sign
    }
    bodies.push(body)
  }

  // 企业微信用两条消息承载正文与相关新闻，其余平台只有一条。
  for (const [index, body] of bodies.entries()) {
    const label = index > 0 ? `${meta.name}（相关新闻）` : meta.name
    await postBody(endpoint.provider, url, body, label)
  }
}

async function postBody(
  provider: WebhookProviderId,
  url: URL,
  body: Record<string, unknown>,
  errorLabel: string
): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ""
    throw new Error(
      name === "TimeoutError" || name === "AbortError"
        ? `${errorLabel} 推送超时（${REQUEST_TIMEOUT_MS / 1000}s）`
        : `${errorLabel} 推送失败：${error instanceof Error ? error.message : String(error)}`
    )
  }

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${errorLabel} HTTP ${response.status}: ${text.slice(0, 160)}`)
  }

  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`${errorLabel} 返回了非 JSON 内容：${text.slice(0, 120)}`)
  }
  if (!parsed || typeof parsed !== "object") return
  assertSuccess(provider, parsed)
}

export type WebhookDelivery = {
  provider: WebhookProviderId
  ok: boolean
  error?: string
}

/**
 * 采集完成后推送。任何一个平台失败都只记日志，不影响已经落库的情报与日报。
 */
export async function notifyWebhooks(
  workspaceId: Workspace["id"],
  message: WebhookMessage
): Promise<WebhookDelivery[]> {
  let endpoints: WebhookEndpoint[] = []
  try {
    endpoints = listEnabledWebhookEndpoints(workspaceId)
  } catch (error) {
    logWarn("webhook.list_failed", {
      workspace: workspaceId,
      message: error instanceof Error ? error.message : String(error),
    })
    return []
  }
  if (endpoints.length === 0) return []

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        await sendWebhook(endpoint, message)
        logInfo("webhook.sent", {
          workspace: workspaceId,
          provider: endpoint.provider,
          title: message.title,
        })
        return { provider: endpoint.provider, ok: true }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        logWarn("webhook.failed", {
          workspace: workspaceId,
          provider: endpoint.provider,
          message: detail.slice(0, 240),
        })
        return { provider: endpoint.provider, ok: false, error: detail }
      }
    })
  )

  return results
}

/** 站内链接前缀；没配就不带链接，避免发出 127.0.0.1。 */
export function appBaseUrl(): string | null {
  const raw = process.env.APP_BASE_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

/** 去掉正文里的 [n] 引用标记：群消息里没有编号对照表，留着反而干扰。 */
function stripCitations(text: string): string {
  return text
    .replace(/\s*\[\d+\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

/** 把日报 Markdown 拆成「导语 / 主题小节 / 情报洞察」。 */
function parseBriefMarkdown(markdown: string): {
  lead: string
  sections: { heading: string; text: string }[]
  takeaways: string[]
} {
  const blocks: { heading: string; lines: string[] }[] = []
  let current: { heading: string; lines: string[] } | null = null

  for (const raw of markdown.split("\n")) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(raw.trim())
    if (headingMatch) {
      current = { heading: headingMatch[1].trim(), lines: [] }
      blocks.push(current)
      continue
    }
    if (current) current.lines.push(raw)
  }

  const textOf = (block: { heading: string; lines: string[] }) =>
    stripCitations(
      block.lines
        .filter((line) => !/^\s*#{1,6}\s/.test(line))
        .join("\n")
        .trim()
    )

  const leadBlock = blocks.find((block) => block.heading === "导语")
  const takeawayBlock = blocks.find((block) => block.heading === "情报洞察")
  const sections = blocks
    .filter(
      (block) =>
        block.heading !== "导语" &&
        block.heading !== "情报洞察" &&
        block.heading !== "来源"
    )
    .map((block) => ({ heading: block.heading, text: textOf(block) }))
    .filter((section) => section.text.length > 0)

  const takeaways = (takeawayBlock?.lines ?? [])
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => stripCitations(line.replace(/^-\s+/, "")))
    .filter(Boolean)

  return {
    lead: leadBlock ? textOf(leadBlock) : "",
    sections,
    takeaways,
  }
}

/** 新闻发布日期：优先用来源给的 MM-DD，其次用抓取日期。 */
function publishLabel(item: IntelItem): string {
  const value = item.publishedAt.trim()
  if (/^\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{2}:\d{2}$/.test(value)) return `${item.date.slice(5)} ${value}`
  return item.date.slice(5)
}

/** 一条新闻一行：`1. [标题](链接) — 站点 · 11-02`。 */
function formatSource(item: IntelItem, index: number): string | null {
  const source = item.sources[0]
  if (!source?.url) return null
  const title = item.title.replace(/[[\]]/g, "（").slice(0, 34)
  const site = source.site ? ` — ${source.site}` : ""
  return `${index + 1}. [${title}](${source.url})${site} · ${publishLabel(item)}`
}

/**
 * 每日日报推送：正文（导语 + 主题小节 + 情报洞察）+ 末尾的相关新闻（标题、链接、发布日期）。
 * 企业微信 / 钉钉会被字节预算裁剪，飞书用卡片完整展示。
 */
export function buildBriefWebhookMessage(input: {
  workspace: Workspace
  brief: Brief
  markdown: string
  /** 与日报引用顺序一致的当日情报。 */
  items: IntelItem[]
}): WebhookMessage {
  const { workspace, brief, markdown, items } = input
  const parsed = parseBriefMarkdown(markdown)

  const sources = items
    .map((item, index) => formatSource(item, index))
    .filter((line): line is string => Boolean(line))
    .slice(0, SOURCE_LIMIT)

  const baseUrl = appBaseUrl()
  const datedLine = `**${brief.date}** · ${brief.items} 条情报 · ${brief.sections} 个板块 · 约 ${brief.readMinutes} 分钟`

  return {
    title: `${workspace.briefLabel} · ${brief.title}`,
    lines: [parsed.lead || brief.summary, datedLine],
    sections: parsed.sections,
    sources,
    sourceNote:
      sources.length > 0 && brief.items > sources.length
        ? `共 ${brief.items} 条情报，这里列出前 ${sources.length} 条`
        : undefined,
    link: baseUrl
      ? `${baseUrl}/briefs?id=${encodeURIComponent(brief.id)}`
      : undefined,
    linkLabel: "查看完整日报",
  }
}

/** 情报洞察单独一段，放在来源之前。 */
export function withTakeaways(
  message: WebhookMessage,
  takeaways: string[]
): WebhookMessage {
  if (takeaways.length === 0) return message
  const block = takeaways.map((item) => `- ${item}`).join("\n")
  return {
    ...message,
    sections: [...(message.sections ?? []), { heading: "情报洞察", text: block }],
  }
}

/** 设置页「测试发送」的样例消息。 */
export function buildTestWebhookMessage(workspace: Workspace): WebhookMessage {
  const baseUrl = appBaseUrl()
  return {
    title: `${workspace.name} · 推送测试`,
    lines: [
      "这是一条来自行业情报雷达的测试消息。",
      "收到它说明 Webhook 地址（和加签密钥）配置正确。",
    ],
    link: baseUrl ? `${baseUrl}/settings` : undefined,
    linkLabel: "打开设置",
  }
}

/**
 * 重新推送「今天/最近一期」日报：读库里已有的日报与情报，不再跑采集。
 * 用于改完文案、补配机器人后手动重发。
 */
export async function resendLatestBrief(
  workspace: Workspace
): Promise<{ date: string; deliveries: WebhookDelivery[] }> {
  const record = await latestBrief(workspace.id)
  if (!record) throw new Error("这个工作区还没有日报，先跑一次采集")

  const items = await listItems(workspace.id, { date: record.brief.date })
  const message = withTakeaways(
    buildBriefWebhookMessage({
      workspace,
      brief: record.brief,
      markdown: record.report.markdown ?? "",
      items: items.slice(0, SOURCE_LIMIT),
    }),
    record.report.takeaways
  )

  const deliveries = await notifyWebhooks(workspace.id, message)
  return { date: record.brief.date, deliveries }
}
