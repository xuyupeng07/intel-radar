/**
 * 群机器人（webhook）接入的公开元数据：客户端表单与服务端发送共用。
 * 这里不 import 任何 Node API，避免把 crypto 打进浏览器 bundle。
 */

export type WebhookProviderId = "wecom" | "dingtalk" | "feishu"

export type WebhookProviderMeta = {
  id: WebhookProviderId
  name: string
  /** 品牌短名，卡片副标题用。 */
  brand: string
  icon: string
  urlPlaceholder: string
  /** 是否需要「加签」密钥（企业微信的 key 在 URL 里，没有签名）。 */
  signed: boolean
  secretLabel: string
  secretHint: string
  urlHint: string
  docUrl: string
}

export const WEBHOOK_PROVIDERS: WebhookProviderMeta[] = [
  {
    id: "wecom",
    name: "企业微信",
    brand: "WeCom",
    icon: "/providers/wecom.png",
    urlPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…",
    signed: false,
    secretLabel: "签名密钥",
    secretHint: "企业微信群机器人没有加签，Key 已在 URL 里，这项留空即可。",
    urlHint: "群聊 → 群机器人 → 添加机器人，复制 Webhook 地址（含 key）。",
    docUrl: "https://developer.work.weixin.qq.com/document/path/91770",
  },
  {
    id: "dingtalk",
    name: "钉钉",
    brand: "DingTalk",
    icon: "/providers/dingtalk.png",
    urlPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=…",
    signed: true,
    secretLabel: "加签密钥",
    secretHint:
      "安全设置选了「加签」才需要填（SEC 开头）。发送时会按官方算法计算 timestamp + sign。",
    urlHint: "群设置 → 智能群助手 → 添加机器人 → 自定义，复制 Webhook 地址。",
    docUrl: "https://open.dingtalk.com/document/orgapp/custom-robot-access",
  },
  {
    id: "feishu",
    name: "飞书",
    brand: "Feishu",
    icon: "/providers/feishu.png",
    urlPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/…",
    signed: true,
    secretLabel: "签名密钥",
    secretHint:
      "机器人安全设置里开了「签名校验」才需要填。签名与时戳放在请求体里，单位是秒。",
    urlHint: "群设置 → 群机器人 → 添加机器人 → 自定义机器人，复制 Webhook 地址。",
    docUrl: "https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot",
  },
]

export const WEBHOOK_PROVIDER_IDS = WEBHOOK_PROVIDERS.map((item) => item.id)

export function isWebhookProviderId(value: unknown): value is WebhookProviderId {
  return (
    value === "wecom" || value === "dingtalk" || value === "feishu"
  )
}

export function webhookProviderById(id: WebhookProviderId): WebhookProviderMeta {
  return WEBHOOK_PROVIDERS.find((item) => item.id === id) ?? WEBHOOK_PROVIDERS[0]
}

/** 设置页可见状态：只告诉前端「配没配密钥」，不下发密钥本身。 */
export type WebhookEndpointState = {
  provider: WebhookProviderId
  url: string
  enabled: boolean
  secretConfigured: boolean
  /** 已保存密钥的掩码（前 4 后 4）；没有则为 null。 */
  secretPreview: string | null
  updatedAt: string | null
}

/**
 * 一条待发送的消息。三个平台各自渲染：
 * - 企业微信/钉钉：markdown（标题 + 行 + 链接）
 * - 飞书：interactive 卡片（标题 + markdown 正文 + 按钮）
 */
export type WebhookMessage = {
  title: string
  /** 导语 / 摘要等纯文本段落。 */
  lines: string[]
  /** 日报主题小节：标题 + 正文。 */
  sections?: { heading: string; text: string }[]
  /** 相关新闻，每行一条已格式化好的 markdown（含文章链接与发布日期）。 */
  sources?: string[]
  /** 来源数量说明，例如「共 72 条情报，这里列出前 12 条」。 */
  sourceNote?: string
  link?: string
  linkLabel?: string
}

/** 归一化用户填的 webhook 地址：去掉首尾空格与可能粘进来的引号。 */
export function normalizeWebhookUrl(raw: string): string {
  return raw.trim().replace(/^[<"']+|[>"']+$/g, "")
}

export function webhookUrlLooksValid(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}
