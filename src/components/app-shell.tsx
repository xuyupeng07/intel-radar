"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandMenuProvider } from "@/components/command-menu"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { WorkspaceProvider } from "@/components/workspace-provider"
import { cn } from "@/lib/utils"
import type { WorkspaceRecord } from "@/lib/workspaces"

export function AppShell({
  children,
  initialWorkspaceId,
  workspaces,
}: {
  children: React.ReactNode
  initialWorkspaceId: string
  workspaces: WorkspaceRecord[]
}) {
  const pathname = usePathname()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const isAgent = pathname === "/agent" || pathname.startsWith("/agent/")

  // 路由切换后回到内容顶部；应用壳层使用独立滚动容器，浏览器不会自动重置。
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return (
    <WorkspaceProvider
      initialWorkspaceId={initialWorkspaceId}
      workspaces={workspaces}
    >
      <CommandMenuProvider>
        <SidebarProvider className="relative h-svh overflow-hidden bg-sidebar">
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
            <div className="absolute -top-48 right-[-12%] size-[42rem] rounded-full bg-[radial-gradient(circle,oklch(0.86_0.2_130/0.11),transparent_66%)] blur-3xl" />
            <div className="absolute bottom-[-20%] left-[28%] size-[34rem] rounded-full bg-[radial-gradient(circle,oklch(0.72_0.18_300/0.1),transparent_68%)] blur-3xl" />
          </div>
          <AppSidebar />
          <SidebarInset className="relative z-10 my-2 mr-2 min-w-0 overflow-hidden rounded-l-[1.75rem] border border-border/70 bg-background/80 shadow-lift backdrop-blur-2xl supports-[overflow:clip]:overflow-clip">
            <AppHeader />
            <div
              ref={scrollRef}
              data-app-scroll
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                isAgent
                  ? "overflow-hidden"
                  : "scrollbar-thin overflow-y-auto overscroll-y-contain"
              )}
            >
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </CommandMenuProvider>
    </WorkspaceProvider>
  )
}
