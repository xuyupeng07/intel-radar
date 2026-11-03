"use server"

import { cookies } from "next/headers"
import { z } from "zod"

import { logInfo, logWarn } from "@/lib/server/logger"
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaceUsage,
  listWorkspaces,
  type WorkspaceUsage,
} from "@/lib/server/repositories/workspaces"
import { WORKSPACE_COOKIE } from "@/lib/workspaces"

export type CreateWorkspaceResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string }

const ONE_YEAR = 60 * 60 * 24 * 365

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "工作区名称至少 2 个字")
    .max(24, "工作区名称最多 24 个字"),
  // 领域自由输入：每个工作区可以是全新领域，不做枚举限制。
  industry: z
    .string()
    .trim()
    .min(2, "领域至少 2 个字")
    .max(12, "领域最多 12 个字"),
})

/**
 * 新建工作区：只写 workspaces 一行。
 * 设置不落库（首次读取走 defaultSettingsFor 的默认值），
 * 搜索源 Key / 情报 / 日报 / 运行记录都按新 id 查询，天然为空。
 */
export async function createWorkspaceAction(input: {
  name: string
  industry: string
}): Promise<CreateWorkspaceResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "参数不合法" }
  }

  const name = parsed.data.name
  const existing = listWorkspaces().find((workspace) => workspace.name === name)
  if (existing) {
    return { ok: false, error: "已经有同名的工作空间了" }
  }

  try {
    const workspace = createWorkspace({
      name,
      industry: parsed.data.industry,
    })

    const store = await cookies()
    store.set(WORKSPACE_COOKIE, workspace.id, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    })

    logInfo("workspace.created", {
      workspace: workspace.id,
      name: workspace.name,
      industry: workspace.industry,
    })
    return { ok: true, id: workspace.id, name: workspace.name }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logWarn("workspace.create_failed", { name, message: message.slice(0, 200) })
    return { ok: false, error: "创建失败，请稍后重试" }
  }
}

export type DeleteWorkspaceResult = { ok: true; fallbackId: string } | { ok: false; error: string }

/**
 * 删除工作区：连带 items / briefs / runs / 设置 / 密钥 / 群机器人 / 定时记录。
 * 只剩一个时拒绝；删的是当前工作区就切到剩下的第一个。
 */
export async function deleteWorkspaceAction(
  id: string
): Promise<DeleteWorkspaceResult> {
  const all = listWorkspaces()
  if (all.length <= 1) {
    return { ok: false, error: "至少要保留一个工作空间" }
  }

  const target = all.find((workspace) => workspace.id === id)
  if (!target) {
    return { ok: false, error: "工作空间不存在或已被删除" }
  }

  try {
    const usage = deleteWorkspace(id)
    const fallback = all.find((workspace) => workspace.id !== id)!

    const store = await cookies()
    if (store.get(WORKSPACE_COOKIE)?.value === id) {
      store.set(WORKSPACE_COOKIE, fallback.id, {
        path: "/",
        maxAge: ONE_YEAR,
        sameSite: "lax",
      })
    }

    logInfo("workspace.deleted", {
      workspace: id,
      name: target.name,
      items: usage.items,
      briefs: usage.briefs,
      runs: usage.runs,
    })
    return { ok: true, fallbackId: fallback.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logWarn("workspace.delete_failed", { id, message: message.slice(0, 200) })
    return { ok: false, error: "删除失败，请稍后重试" }
  }
}

export type WorkspaceUsageMap = Record<string, WorkspaceUsage>

export type WorkspaceAdminList = {
  workspaces: Array<{
    id: string
    name: string
    industry: string
    plan: string
    briefLabel: string
    collectTarget: string
  }>
  usage: WorkspaceUsageMap
}

/** 打开「管理工作空间」时取一次最新列表与数据量（不依赖页面缓存的旧列表）。 */
export async function workspaceAdminListAction(): Promise<WorkspaceAdminList> {
  return { workspaces: listWorkspaces(), usage: listWorkspaceUsage() }
}
