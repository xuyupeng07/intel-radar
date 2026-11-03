"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Add01Icon,
  ChevronRightIcon,
  Logout01Icon,
  Menu01Icon,
  Search01Icon,
  Settings01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useCommandMenu } from "@/components/command-menu"
import { RadarMark } from "@/components/brand/radar-mark"
import { CreateWorkspaceDialog } from "@/components/workspace-create-dialog"
import { WorkspaceManageDialog } from "@/components/workspace-manage-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWorkspace } from "@/components/workspace-provider"
import { CURRENT_USER } from "@/lib/current-user"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  NAV_GROUPS,
  getActiveParentTitles,
  isChildActive,
  isNavParent,
  type NavLeaf,
  type NavParent,
} from "@/lib/nav"
import { NavIcon } from "@/components/nav-icon"
import { cn } from "@/lib/utils"

function MobileNavBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={value === "New" || value === "Live" ? "outline" : "secondary"}
      className={cn(
        "ml-auto h-5 min-w-5 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        value === "New" &&
          "border-primary/25 bg-primary/10 text-primary dark:border-blue-400/35 dark:bg-blue-400/10 dark:text-blue-300",
        value === "Live" &&
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        value !== "New" && value !== "Live" && "text-muted-foreground"
      )}
    >
      {value === "Live" ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
      {value}
    </Badge>
  )
}

function MobileNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavLeaf
  pathname: string
  onNavigate: () => void
}) {
  const active = isChildActive(pathname, item)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <NavIcon item={item} className="size-4" strokeWidth={active ? 2.2 : 2} />
      <span className="truncate">{item.title}</span>
      {item.badge ? <MobileNavBadge value={item.badge} /> : null}
    </Link>
  )
}

function MobileNavParentItem({
  item,
  pathname,
  open,
  onOpenChange,
  onNavigate,
}: {
  item: NavParent
  pathname: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
}) {
  const active = item.items.some((child) => isChildActive(pathname, child))

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors",
          active
            ? "bg-sidebar-accent/60 font-medium text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <NavIcon item={item} className="size-4" strokeWidth={active ? 2.2 : 2} />
        <span className="truncate">{item.title}</span>
        <HugeiconsIcon
          icon={ChevronRightIcon}
          className={cn(
            "ml-auto size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            open && "rotate-90"
          )}
          strokeWidth={2}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden" inert={!open} aria-hidden={!open}>
          <div className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-sidebar-border/70 py-0.5 pl-3">
            {item.items.map((child) => {
              const childActive = isChildActive(pathname, child)
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors",
                    childActive
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="truncate">{child.title}</span>
                  {child.badge ? <MobileNavBadge value={child.badge} /> : null}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  const [parentOverrides, setParentOverrides] = React.useState<Record<string, boolean>>({})
  const { workspace, workspaces, setWorkspace } = useWorkspace()
  const { open: openCommandMenu } = useCommandMenu()
  const activeParents = new Set(getActiveParentTitles(pathname))

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="打开导航"
            className="text-muted-foreground max-lg:size-10 lg:hidden"
          />
        }
      >
        <HugeiconsIcon icon={Menu01Icon} className="size-4" strokeWidth={2} />
      </SheetTrigger>

      <SheetContent side="left" className="w-72! max-w-[85vw] gap-0 p-0">
        <SheetHeader className="gap-2 border-b px-3 pt-3 pb-3">
          <SheetTitle className="sr-only">导航</SheetTitle>

          {/* 工作空间切换：和桌面侧边栏共用同一份状态 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-xl p-1.5 pr-10 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60 focus-visible:outline-none"
                />
              }
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <HugeiconsIcon icon={workspace.icon} className="size-4" strokeWidth={2} />
              </span>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">
                  {workspace.name}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {workspace.plan}
                </span>
              </span>
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                className="size-4 shrink-0 text-muted-foreground"
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

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              openCommandMenu()
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-sidebar-border/70 bg-background/60 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Search01Icon} className="size-3.5" strokeWidth={2} />
            搜索页面或操作
          </button>
        </SheetHeader>

        <nav className="scrollbar-thin flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5 py-1">
              <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) =>
                isNavParent(item) ? (
                  <MobileNavParentItem
                    key={item.title}
                    item={item}
                    pathname={pathname}
                    open={
                      parentOverrides[`${pathname}:${item.title}`] ??
                      activeParents.has(item.title)
                    }
                    onOpenChange={(next) =>
                      setParentOverrides((previous) => ({
                        ...previous,
                        [`${pathname}:${item.title}`]: next,
                      }))
                    }
                    onNavigate={() => setOpen(false)}
                  />
                ) : (
                  <MobileNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                )
              )}
            </div>
          ))}
        </nav>

        {/* 账户区：移动端原本完全缺失，看不到当前用户、也退不出去 */}
        <div className="border-t p-2 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <Avatar className="size-10 shrink-0 rounded-xl bg-white p-1 after:rounded-xl after:border-border/60">
              <AvatarImage
                src={CURRENT_USER.avatar}
                alt={CURRENT_USER.name}
                className="rounded-lg object-contain"
              />
              <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-medium text-primary">
                {CURRENT_USER.fallback}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{CURRENT_USER.name}</span>
              <span
                className="truncate text-[11px] text-muted-foreground"
                title={CURRENT_USER.email}
              >
                {CURRENT_USER.email}
              </span>
            </div>
          </div>

          <div className="mt-1 grid grid-cols-2 gap-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-10 justify-center gap-1.5",
              })}
            >
              <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
              账户设置
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                toast.info("骨架阶段：登录态尚未接入")
              }}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "h-10 w-full justify-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive",
              })}
            >
              <HugeiconsIcon icon={Logout01Icon} className="size-4" strokeWidth={2} />
              退出登录
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
