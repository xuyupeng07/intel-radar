"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MobileNav } from "@/components/mobile-nav"
import { useCommandMenu } from "@/components/command-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { getNavTrail, isNavParent, PAGE_TITLES } from "@/lib/nav"

export function AppHeader() {
  const pathname = usePathname()
  const trail = getNavTrail(pathname)
  const title = trail?.leaf.title ?? PAGE_TITLES[pathname] ?? "今日情报"
  const groupLabel = trail?.group.label ?? "阅读"
  const firstItem = trail?.group.items[0]
  const groupHref = firstItem
    ? isNavParent(firstItem)
      ? firstItem.items[0].href
      : firstItem.href
    : "/today"
  const { open } = useCommandMenu()
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/55 px-4 backdrop-blur-xl md:px-7">
      <MobileNav />
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="flex-nowrap">
          {trail ? (
            <>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink render={<Link href={groupHref} />}>{groupLabel}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
            </>
          ) : null}
          {trail?.parent ? (
            <>
              <BreadcrumbItem className="hidden md:inline-flex">
                <BreadcrumbLink render={<Link href={trail.parent.items[0].href} />}>
                  {trail.parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate font-medium text-foreground">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={open}
          className="hidden h-8 w-60 justify-start gap-2 rounded-full border-border/70 bg-card/55 text-muted-foreground shadow-none md:flex"
        >
          <HugeiconsIcon icon={Search01Icon} className="size-3.5" strokeWidth={2} />
          <span className="text-xs">搜索页面或操作</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={open}
          aria-label="搜索"
          className="text-muted-foreground max-md:size-10 md:hidden"
        >
          <HugeiconsIcon icon={Search01Icon} className="size-4" strokeWidth={2} />
        </Button>

        <ThemeToggle />

        <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase lg:inline-flex">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          Live
        </span>
      </div>
    </header>
  )
}
