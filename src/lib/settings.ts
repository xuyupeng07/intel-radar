/**
 * 采集与生成参数：搜索词、时间窗口、条数、模型都在设置里维护。
 * 这里不 import 数据库，客户端表单与服务端 seed 共用同一份默认值。
 */

import {
  EMPTY_DEEPSEEK_SYNTAX,
  type DeepSeekSyntax,
} from "@/lib/deepseek-query"
import type { SearchProviderId } from "@/lib/search-providers"
import type { WorkspaceId } from "@/lib/workspaces"

/** DeepSeek 的 lang 操作符；zh,en 表示中英同时召回。 */
export type SearchLang = "zh" | "en" | "zh,en"

export type AppSettings = {
  /** 分类去重与日报生成共用的对话模型。 */
  chatModel: string
  /** 当前工作区启用的搜索源，可多选；采集会并行请求。 */
  searchProviders: SearchProviderId[]
  /** 每行一条检索词，DeepSeek 会自动补 after 与 lang。 */
  queries: string[]
  /** 搜索语言；只有 DeepSeek 透传 lang 操作符。 */
  searchLang: SearchLang
  /** 每条检索词请求多少条结果，1–50。 */
  searchCount: number
  /** 每日情报条数上限，30–120；与日报引用上限分开。 */
  itemLimit: number
  /** 回看天数，1 表示近 24 小时。 */
  lookbackDays: number
  /** 交给日报模型的情报条数上限。 */
  briefItemLimit: number
  /** 是否启用每日定时运行。 */
  scheduleEnabled: boolean
  /** 每天执行时间，HH:mm，按 Asia/Shanghai。 */
  scheduleTime: string
  /** 运行日，ISO 1=周一 … 7=周日。 */
  scheduleDays: number[]
  /** 服务重启后是否补跑当天已过时间的一次任务。 */
  scheduleCatchUp: boolean
  /** DeepSeek 专属检索语法：限定/排除站点与短语，采集时拼进每条 query。 */
  deepseekSyntax: DeepSeekSyntax
  /** 日报生成的 system prompt。 */
  briefSystemPrompt: string
  /** 日报生成的 user prompt，支持 {{count}} / {{window}} / {{date}} / {{items}}。 */
  briefUserPrompt: string
}

export const DEFAULT_QUERIES = [
  "央行 货币政策 流动性 金融监管 最新消息",
  "券商 基金 保险 银行 业绩 监管 动态",
  "A股 港股 债市 汇率 资金面 北向资金",
  "金融科技 支付 消费金融 监管 动态",
  "金融 市场 今日 行情 收盘 资金流向",
  "银行 理财 信贷 不良 资产 处置",
]

export const AI_QUERIES = [
  "大模型 发布 推理 算力 最新消息",
  "AI Agent 智能体 应用 落地 最新消息",
  "英伟达 GPU HBM 算力 芯片 最新消息",
  "人工智能 融资 创业公司 估值 最新消息",
  "人工智能 监管 政策 合规 最新消息",
  "多模态 开源模型 技术 突破 最新消息",
]

function buildBriefUserPrompt(industry: string, reportKind: string): string {
  return `日期：{{date}}（Asia/Shanghai）。
基于下面的 {{count}} 条{{window}}的${industry}情报，写一篇${reportKind}。要求：

- title：不超过 14 字，点出今天的主线。
- summary：50–80 字，一段话概括。
- 先判断今天的主线，再选 3–4 个主题；不要把情报按来源或板块逐条罗列。
- 优先采用多源印证、重要度高、来源权威的情报；单一来源的关键事实用限定措辞（如「据…报道」），不把推测写成事实。
- 不同情报对同一事实有冲突时，在正文中明确写出分歧，不要强行合并；传闻、预测、观点必须标明性质。
- 每个主题小节尽量由 2 条以上不同情报支撑；不要为了凑引用重复同一事实。
- 正文用标准 Markdown 写，放在 markdown 字段里。
- markdown 以「## 导语」开头，下面 150–220 字，给出今天最重要的结论。
- 接着 3–4 个主题小节，每个用「## 1. 主题标题」「## 2. 主题标题」……；序号从 1. 开始，标题不超过 12 字，正文 1–2 段、每段 100–180 字。
- 最后写「## 情报洞察」，下面用「- 」列 3 条洞察，每条 40–70 字；这是全文最后一节。
- 主题小节标题必须以 1.、2.……开头（数字 + 英文句点 + 空格），导语与情报洞察不加序号；不要用一级标题 #；不要写一、二或「第一部分」这类文字序号；不要手工加粗标题。
- 正文中用 [n] 标注引用，n 是下面情报的序号（1 开始），每段至少引用 1 条；只能引用下方真实存在的编号，不得编造来源或编号。
- 数字、事实、引语必须来自情报，不得编造；情报洞察只基于正文事实，不引入新信息。
- 同一事实不要跨小节重复；每个主题小节只讲一条主线。
- 不要写来源列表，来源由系统追加；不要写“本文将”“综上所述”这类套话。
- 段落、标题、列表之间用空行分隔。

只返回 JSON：
{"title":"…","summary":"…","markdown":"## 导语\\n\\n…\\n\\n## 1. 主题一\\n\\n…\\n\\n## 2. 主题二\\n\\n…\\n\\n## 情报洞察\\n\\n- …"}

情报：
{{items}}`
}

export const DEFAULT_BRIEF_SYSTEM_PROMPT =
  "你是资深金融日报主编。只输出 JSON，不要解释。日报必须归纳主线，不能逐条罗列；优先使用多源印证与一手来源，事实与观点分开，冲突信息要说明；主题小节用 1. 2. 编号，导语与情报洞察不编号。"

export const AI_BRIEF_SYSTEM_PROMPT =
  "你是资深 AI 行业日报主编。只输出 JSON，不要解释。日报必须归纳人工智能行业主线，不能逐条罗列；优先使用多源印证与一手来源，事实与观点分开，冲突信息要说明；主题小节用 1. 2. 编号，导语与情报洞察不编号。"

export const DEFAULT_BRIEF_USER_PROMPT = buildBriefUserPrompt("金融", "中文日报")

export const AI_BRIEF_USER_PROMPT = buildBriefUserPrompt(
  "人工智能",
  "AI 行业中文日报"
)

export const DEFAULT_SETTINGS: AppSettings = {
  chatModel: "deepseek-flash",
  searchProviders: ["deepseek"],
  queries: DEFAULT_QUERIES,
  searchLang: "zh",
  searchCount: 10,
  itemLimit: 80,
  lookbackDays: 1,
  briefItemLimit: 60,
  scheduleEnabled: true,
  scheduleTime: "08:00",
  scheduleDays: [1, 2, 3, 4, 5, 6, 7],
  scheduleCatchUp: false,
  deepseekSyntax: { ...EMPTY_DEEPSEEK_SYNTAX },
  briefSystemPrompt: DEFAULT_BRIEF_SYSTEM_PROMPT,
  briefUserPrompt: DEFAULT_BRIEF_USER_PROMPT,
}

export const AI_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  queries: AI_QUERIES,
  briefSystemPrompt: AI_BRIEF_SYSTEM_PROMPT,
  briefUserPrompt: AI_BRIEF_USER_PROMPT,
}

/**
 * 全新领域的工作区：给一份通用模板，检索词与提示词都按领域名生成。
 * 用户拿到后按自己的领域改检索词、改提示词，不是继承金融/AI 的预设。
 */
export function neutralSettingsFor(industry: string): AppSettings {
  const name = industry.trim() || "行业"
  return {
    ...DEFAULT_SETTINGS,
    queries: [
      `${name} 最新动态 重要进展`,
      `${name} 政策 监管 合规`,
      `${name} 融资 并购 市场`,
    ],
    briefSystemPrompt: `你是资深${name}行业日报主编。只输出 JSON，不要解释。日报必须归纳${name}行业主线，不能逐条罗列；优先使用多源印证与一手来源，事实与观点分开，冲突信息要说明；主题小节用 1. 2. 编号，导语与情报洞察不编号。`,
    briefUserPrompt: buildBriefUserPrompt(name, `${name}中文日报`),
    deepseekSyntax: { ...EMPTY_DEEPSEEK_SYNTAX },
  }
}

/**
 * 按领域取默认设置：
 * - 金融 / 人工智能 沿用出厂预设；
 * - 其它（新建的自定义领域）用通用模板，领域名会替换进提示词与检索词。
 */
export function defaultSettingsFor(industry = "金融"): AppSettings {
  if (industry === "金融") {
    return { ...DEFAULT_SETTINGS, queries: [...DEFAULT_QUERIES], deepseekSyntax: { ...EMPTY_DEEPSEEK_SYNTAX } }
  }
  if (industry === "人工智能") {
    return { ...AI_SETTINGS, queries: [...AI_QUERIES], deepseekSyntax: { ...EMPTY_DEEPSEEK_SYNTAX } }
  }
  return neutralSettingsFor(industry)
}
