"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  hydrateWorkspace,
  WORKSPACE_COOKIE,
  type Workspace,
  type WorkspaceRecord,
} from "@/lib/workspaces"

type WorkspaceContextValue = {
  workspace: Workspace
  workspaces: Workspace[]
  setWorkspace: (workspace: Workspace) => void
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * 工作区状态同时存在 React state 与 cookie：
 * - state 让侧栏立即切换；
 * - cookie 让服务端页面、Server Action 与 API 读到同一个工作区；
 * - router.refresh() 重新取当前工作区的数据。
 *
 * 工作区列表来自数据库（可以新建），图标在前端按领域补上。
 */
export function WorkspaceProvider({
  children,
  initialWorkspaceId,
  workspaces,
}: {
  children: React.ReactNode
  initialWorkspaceId: string
  workspaces: WorkspaceRecord[]
}) {
  const router = useRouter()
  const list = React.useMemo(
    () => workspaces.map(hydrateWorkspace),
    [workspaces]
  )
  const [workspaceId, setWorkspaceId] = React.useState(initialWorkspaceId)

  React.useEffect(() => {
    setWorkspaceId(initialWorkspaceId)
  }, [initialWorkspaceId])

  const workspace = list.find((item) => item.id === workspaceId) ?? list[0]

  const selectWorkspace = React.useCallback(
    (next: Workspace) => {
      setWorkspaceId(next.id)
      document.cookie = `${WORKSPACE_COOKIE}=${next.id}; path=/; max-age=${ONE_YEAR}; samesite=lax`
      React.startTransition(() => {
        router.refresh()
      })
    },
    [router]
  )

  const value = React.useMemo(
    () => ({ workspace, workspaces: list, setWorkspace: selectWorkspace }),
    [workspace, list, selectWorkspace]
  )

  if (!workspace) return null

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext)
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return context
}
