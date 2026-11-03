import { AppShell } from "@/components/app-shell"
import {
  getActiveWorkspace,
  listWorkspaceRecords,
} from "@/lib/server/workspace"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [workspace, workspaces] = await Promise.all([
    getActiveWorkspace(),
    listWorkspaceRecords(),
  ])

  return (
    <AppShell initialWorkspaceId={workspace.id} workspaces={workspaces}>
      {children}
    </AppShell>
  )
}
