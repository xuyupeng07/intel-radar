import "server-only"

import { cookies } from "next/headers"

import {
  getWorkspaceRecord,
  listWorkspaces,
} from "@/lib/server/repositories/workspaces"
import {
  DEFAULT_WORKSPACE_ID,
  hydrateWorkspace,
  WORKSPACE_COOKIE,
  type Workspace,
  type WorkspaceRecord,
} from "@/lib/workspaces"

/** 全部工作区（不含图标，可直接跨 RSC 传给客户端组件）。 */
export async function listWorkspaceRecords(): Promise<WorkspaceRecord[]> {
  return listWorkspaces()
}

/** 当前工作区由 cookie 决定；服务端页面、Server Action 与 API 共用。 */
export async function getActiveWorkspace(): Promise<Workspace> {
  const store = await cookies()
  const record =
    getWorkspaceRecord(store.get(WORKSPACE_COOKIE)?.value) ??
    getWorkspaceRecord(DEFAULT_WORKSPACE_ID) ??
    listWorkspaces()[0]

  if (!record) {
    throw new Error("数据库里没有任何工作区，请先执行初始化（启动时会自动 seed）")
  }
  return hydrateWorkspace(record)
}

export async function getActiveWorkspaceId(): Promise<string> {
  return (await getActiveWorkspace()).id
}
