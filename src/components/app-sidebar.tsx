"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Add01Icon,
  CheckmarkBadge01Icon,
  ChevronRightIcon,
  CommandIcon,
  PlayCircleIcon,
  Settings01Icon,
  Logout01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { useCommandMenu } from "@/components/command-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { logoutAction } from "@/lib/server/actions/auth"
import { NavIcon } from "@/components/nav-icon"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { RadarMark } from "@/components/brand/radar-mark"
import { CreateWorkspaceDialog } from "@/components/workspace-create-dialog"
import { WorkspaceManageDialog } from "@/components/workspace-manage-dialog"
import { useWorkspace } from "@/components/workspace-provider"
import { CURRENT_USER } from "@/lib/current-user"
import {
  getActiveParentTitles,
  isChildActive,
  isNavParent,
  NAV_GROUPS,
  type NavLeaf,
  type NavParent,
} from "@/lib/nav"
import { cn } from "@/lib/utils"

const MENU_ITEM_CLASS =
  "h-9 scroll-mt-2 scroll-mb-6 gap-2.5 rounded-full px-3 text-sm font-normal data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground"

/** 父级菜单的展开状态：默认展开当前路由所在的父级。 */
function getActiveParents(pathname: string) {
  const state: Record<string, boolean> = {}
  for (const title of getActiveParentTitles(pathname)) {
    state[title] = true
  }
  return state
}

function NavBadge({
  value,
  tone = "muted",
  className,
}: {
  value: string
  tone?: "muted" | "primary" | "live"
  className?: string
}) {
  return (
    <Badge
      variant={tone === "primary" || tone === "live" ? "outline" : "secondary"}
      className={cn(
        "ml-auto h-5 min-w-5 shrink-0 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        tone === "muted" && "text-muted-foreground",
        tone === "primary" &&
          "border-primary/25 bg-primary/10 text-primary dark:border-blue-400/35 dark:bg-blue-400/10 dark:text-blue-300",
        tone === "live" &&
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      {tone === "live" ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
      {value}
    </Badge>
  )
}

function SidebarLeafItem({
  item,
  pathname,
  featured,
}: {
  item: NavLeaf
  pathname: string
  featured?: boolean
}) {
  const active = isChildActive(pathname, item)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.title}
        data-nav-active={active ? "true" : undefined}
        className={cn(MENU_ITEM_CLASS, featured && "text-foreground")}
        render={
          <Link href={item.href} aria-current={active ? "page" : undefined} />
        }
      >
        <NavIcon item={item} className="size-4" strokeWidth={active ? 2.2 : 1.8} />
        <span>{item.title}</span>
        {item.badge ? (
          <NavBadge
            value={item.badge}
            tone={
              featured
                ? "primary"
                : item.badge === "Live"
                  ? "live"
                  : "muted"
            }
            className={
              active
                ? "border-sidebar-accent-foreground/20 bg-sidebar-accent-foreground/15 text-sidebar-accent-foreground"
                : undefined
            }
          />
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarSubItem({
  item,
  pathname,
  parentTitle,
}: {
  item: NavLeaf
  pathname: string
  parentTitle: string
}) {
  const active = isChildActive(pathname, item)

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={active}
        data-nav-active={active ? "true" : undefined}
        render={
          <Link href={item.href} aria-current={active ? "page" : undefined} />
        }
        className="relative h-8 scroll-mt-2 scroll-mb-6 gap-2 overflow-hidden rounded-lg px-2.5 text-[13px] font-normal text-sidebar-foreground/75 transition-colors hover:text-sidebar-foreground data-active:bg-transparent data-active:font-medium data-active:text-sidebar-accent-foreground"
      >
        {active ? (
          <motion.span
            layoutId={`sidebar-submenu-active-${parentTitle}`}
            className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sidebar-border)_55%,transparent)]"
            transition={{ type: "spring", stiffness: 520, damping: 42 }}
          />
        ) : null}
        <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
          <NavIcon
            item={item}
            className={cn(
              "size-3.5 shrink-0",
              active
                ? "text-sidebar-accent-foreground"
                : "text-muted-foreground/80"
            )}
            strokeWidth={active ? 2.2 : 1.8}
          />
          <span className="truncate">{item.title}</span>
        </span>
        {item.badge ? (
          <NavBadge
            value={item.badge}
            tone={item.badge === "Q4" || item.badge === "New" ? "primary" : "muted"}
            className="relative z-10 ml-auto"
          />
        ) : null}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function SidebarParentItem({
  item,
  pathname,
  open,
  onOpenChange,
}: {
  item: NavParent
  pathname: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const active = item.items.some((child) => isChildActive(pathname, child))

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      render={<SidebarMenuItem />}
      className="group/nav-parent"
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            isActive={active}
            tooltip={item.title}
            data-nav-active={active ? "true" : undefined}
            className={cn(
              MENU_ITEM_CLASS,
              "cursor-pointer data-active:bg-sidebar-accent/65"
            )}
          />
        }
      >
        <NavIcon
          item={item}
          className={cn(
            "size-4 transition-colors",
            active && "text-sidebar-accent-foreground"
          )}
          strokeWidth={active ? 2.2 : 1.8}
        />
        <span>{item.title}</span>
        {item.badge ? (
          <NavBadge
            value={item.badge}
            className={
              active
                ? "border-sidebar-accent-foreground/20 bg-sidebar-accent-foreground/15 text-sidebar-accent-foreground"
                : undefined
            }
          />
        ) : null}
        <HugeiconsIcon
          icon={ChevronRightIcon}
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            !item.badge && "ml-auto",
            "group-data-[open]/nav-parent:rotate-90"
          )}
          strokeWidth={2}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[starting-style]:h-0 data-[ending-style]:h-0">
        <SidebarMenuSub className="my-0.5 ml-[1.15rem] gap-0.5 border-sidebar-border/70 py-0.5 pr-0 pl-3">
          {item.items.map((child) => (
            <SidebarSubItem
              key={child.href}
              item={child}
              pathname={pathname}
              parentTitle={item.title}
            />
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { open: openCommandMenu } = useCommandMenu()
  const { workspace, workspaces, setWorkspace } = useWorkspace()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  // 手动展开/收起状态按“路由 + 父级”记录：切到新页面时默认展开命中的父级，
  // 又不会因为一次手动收起就永久丢掉后续路由的自动展开。
  const [parentOverrides, setParentOverrides] = React.useState<Record<string, boolean>>({})
  const activeParents = getActiveParents(pathname)
  const navRef = React.useRef<HTMLDivElement>(null)

  // 深层页面（如系统设置、异常页）命中项可能在可视区外，切路由后轻推到视野内。
  // 折叠面板有 300ms 高度动画，等展开完成再对齐一次，避免按收起时的位置滚动。
  React.useEffect(() => {
    const scrollActive = () => {
      const nodes = navRef.current?.querySelectorAll<HTMLElement>('[data-nav-active="true"]')
      nodes?.[nodes.length - 1]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
    scrollActive()
    const timer = window.setTimeout(scrollActive, 340)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return (
    <Sidebar collapsible="none" className="h-full max-lg:hidden">
      <SidebarHeader className="gap-3 pb-2">
        <Link href="/today" className="flex items-center justify-between px-2 pt-1">
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full text-primary drop-shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
              <RadarMark className="size-6" />
            </span>
            <span className="text-display shrink-0 text-[1.5rem] leading-none tracking-tight whitespace-nowrap">
              Radar<span className="text-primary">.</span>
            </span>
          </span>
          <span className="eyebrow shrink-0 text-[8px]">Signal</span>
        </Link>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="h-14 cursor-pointer rounded-2xl border border-sidebar-border/60 bg-card/35 hover:bg-card/70 data-popup-open:bg-card data-popup-open:ring-1 data-popup-open:ring-border"
                  />
                }
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground/90 text-background shadow-sm">
                  <HugeiconsIcon icon={workspace.icon} className="size-4" strokeWidth={2} />
                </div>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {workspace.name}
                  </span>
                  <span className="truncate text-[11px] font-normal text-muted-foreground">
                    {workspace.plan}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  className="ml-auto size-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-(--anchor-width) max-w-(--available-width) rounded-2xl p-1.5">
                <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                  工作空间
                </div>
                {workspaces.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="rounded-xl py-2"
                    onClick={() => setWorkspace(item)}
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg border bg-muted/50">
                      <HugeiconsIcon icon={item.icon} className="size-3.5" strokeWidth={2} />
                    </span>
                    <span className="grid min-w-0 flex-1 leading-tight">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.plan}</span>
                    </span>
                    {workspace.id === item.id ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        className="ml-auto size-4 text-primary"
                        strokeWidth={2}
                      />
                    ) : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() => setCreateOpen(true)}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
                  新建工作空间
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() => setManageOpen(true)}
                >
                  <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
                  管理工作空间
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
            <WorkspaceManageDialog open={manageOpen} onOpenChange={setManageOpen} />
          </SidebarMenuItem>
        </SidebarMenu>

        <button
          type="button"
          onClick={openCommandMenu}
          className="group flex h-9 items-center gap-2 rounded-full border border-sidebar-border/70 bg-card/35 px-3 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <HugeiconsIcon icon={CommandIcon} className="size-3.5" strokeWidth={2} />
          <span>搜索或跳转…</span>
          <kbd className="ml-auto rounded border border-border/60 bg-foreground/[0.06] px-1 py-0.5 font-sans text-[11px] leading-none text-muted-foreground transition-colors group-hover:border-sidebar-accent-foreground/25 group-hover:bg-transparent group-hover:text-sidebar-accent-foreground">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <div ref={navRef} className="relative flex min-h-0 flex-1 flex-col">
        <SidebarContent className="scrollbar-thin gap-0 overscroll-contain py-1">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel className="h-6 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground/80">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) =>
                    isNavParent(item) ? (
                      <SidebarParentItem
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        open={
                          parentOverrides[`${pathname}:${item.title}`] ??
                          Boolean(activeParents[item.title])
                        }
                        onOpenChange={(open) =>
                          setParentOverrides((previous) => ({
                            ...previous,
                            [`${pathname}:${item.title}`]: open,
                          }))
                        }
                      />
                    ) : (
                      <SidebarLeafItem
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        featured={item.href === "/chat"}
                      />
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-sidebar to-transparent [@media(min-height:1400px)]:hidden"
        />
      </div>

      <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    aria-label={`打开 ${CURRENT_USER.name} 的账户菜单`}
                    className="h-14 cursor-pointer rounded-2xl border border-sidebar-border/60 bg-card/35 hover:bg-card/70 data-popup-open:bg-card data-popup-open:ring-1 data-popup-open:ring-border"
                  />
                }
              >
                <Avatar className="size-9 shrink-0 rounded-xl bg-white p-1 after:rounded-xl after:border-border/60">
                  <AvatarImage
                    src={CURRENT_USER.avatar}
                    alt={CURRENT_USER.name}
                    className="rounded-lg object-contain"
                  />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-medium text-primary">
                    {CURRENT_USER.fallback}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {CURRENT_USER.name}
                  </span>
                  <span
                    className="truncate text-[11px] font-normal text-muted-foreground"
                    title={CURRENT_USER.email}
                  >
                    {CURRENT_USER.email}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  className="ml-auto size-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-(--anchor-width) min-w-56 overflow-hidden rounded-xl p-1 shadow-xl ring-1 ring-border/70"
              >
                <div className="flex items-center gap-2 px-1.5 py-1.5">
                  <Avatar className="size-8 shrink-0 rounded-lg bg-white p-1 after:rounded-lg after:border-border/60">
                    <AvatarImage
                      src={CURRENT_USER.avatar}
                      alt={CURRENT_USER.name}
                      className="rounded-md object-contain"
                    />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                      {CURRENT_USER.fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {CURRENT_USER.name}
                    </span>
                    <span
                      className="truncate text-[11px] text-muted-foreground"
                      title={CURRENT_USER.email}
                    >
                      {CURRENT_USER.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator className="my-0" />
                <DropdownMenuItem
                  className="h-9 cursor-pointer gap-2.5 rounded-xl px-2 text-sm"
                  render={<Link href="/settings" />}
                >
                  <HugeiconsIcon
                    icon={CheckmarkBadge01Icon}
                    className="size-5 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                  账户设置
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-9 cursor-pointer gap-2.5 rounded-xl px-2 text-sm"
                  render={<Link href="/runs" />}
                >
                  <HugeiconsIcon
                    icon={PlayCircleIcon}
                    className="size-5 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                  运行记录
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-0" />
                <DropdownMenuItem
                  variant="destructive"
                  className="h-9 cursor-pointer gap-2.5 rounded-xl px-2 text-sm"
                  onClick={() => {
                    void logoutAction()
                  }}
                >
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    className="size-5"
                    strokeWidth={1.8}
                  />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
