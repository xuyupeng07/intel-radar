import {
  AiBrain01Icon,
  Building01Icon,
  Globe02Icon,
} from "@hugeicons/core-free-icons"

/**
 * 工作区是数据边界：items / briefs / runs / settings / webhook_endpoints
 * 全部按 `workspace_id` 隔离。工作区本身存 `workspaces` 表，可动态新建，
 * 这里只保留类型、领域预设与文案派生规则（不碰数据库）。
 */

export type WorkspaceId = string

export type WorkspaceRecord = {
  id: string
  name: string
  /** 领域名，决定默认提示词、图标与日报名。 */
  industry: string
  /** 侧栏副标题与切换器里的说明。 */
  plan: string
  /** 日报运行记录的 target 前缀，例如「AI 日报」。 */
  briefLabel: string
  /** 采集运行记录的 target，例如「AI 情报采集」。 */
  collectTarget: string
}

export type Workspace = WorkspaceRecord & {
  icon: typeof Building01Icon
}

export const WORKSPACE_COOKIE = "intel_workspace"
export const DEFAULT_WORKSPACE_ID = "finance"

/**
 * 领域是自由输入：每个工作区可以是一个全新领域。
 * 这些只是输入框下方的快捷建议，点一下填进去，仍然可以改。
 */
export const INDUSTRY_SUGGESTIONS = [
  "金融",
  "人工智能",
  "新能源",
  "半导体",
  "医疗健康",
  "消费",
] as const

export function workspaceIcon(industry: string): typeof Building01Icon {
  if (industry === "金融") return Building01Icon
  if (industry === "人工智能") return AiBrain01Icon
  return Globe02Icon
}

/** 日报名 / 运行记录前缀：人工智能对外统一叫「AI」。 */
export function briefPrefixFor(industry: string): string {
  return industry === "人工智能" ? "AI" : industry
}

/** 按领域派生默认文案与图标，新建工作区与种子数据共用。 */
export function workspaceProfile(industry: string): {
  plan: string
  briefLabel: string
  collectTarget: string
  icon: typeof Building01Icon
} {
  const prefix = briefPrefixFor(industry)
  return {
    plan: `${industry} · 每日情报`,
    briefLabel: `${prefix}日报`,
    collectTarget: `${prefix}情报采集`,
    icon: workspaceIcon(industry),
  }
}

/** 把数据库里的一行补成带图标与派生文案的 Workspace（图标不进数据库）。 */
export function hydrateWorkspace(record: WorkspaceRecord): Workspace {
  return { ...record, icon: workspaceIcon(record.industry) }
}

/**
 * 首启动种子数据：两个演示工作区。
 * 新建工作区走 `createWorkspace`，不再往这里加。
 */
export const SEED_WORKSPACES: Array<{
  id: string
  name: string
  industry: string
  plan: string
}> = [
  {
    id: "finance",
    name: "金融情报组",
    industry: "金融",
    plan: "金融领域 · 每日情报",
  },
  {
    id: "ai",
    name: "AI 情报组",
    industry: "人工智能",
    plan: "人工智能 · 每日情报",
  },
]
