"use client"

import * as React from "react"
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IntelItem } from "@/lib/intel"
import { cn } from "@/lib/utils"

export type DailyFeedItem = IntelItem & {
  /** 服务端预拼好的检索文本：标题、副标题、来源、板块、标签。 */
  searchText: string
}

type DailySearchContextValue = {
  items: DailyFeedItem[]
  filtered: DailyFeedItem[]
  query: string
  setQuery: (value: string) => void
  terms: string[]
}

const DailySearchContext =
  React.createContext<DailySearchContextValue | null>(null)

export function useDailySearch() {
  const context = React.useContext(DailySearchContext)
  if (!context) {
    throw new Error("useDailySearch must be used inside DailySearchProvider")
  }
  return context
}

export function DailySearchProvider({
  items,
  children,
}: {
  items: DailyFeedItem[]
  children: React.ReactNode
}) {
  const [query, setQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(query)
  const terms = deferredQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const filtered =
    terms.length === 0
      ? items
      : items.filter((item) => terms.every((term) => item.searchText.includes(term)))

  return (
    <DailySearchContext.Provider
      value={{ items, filtered, query, setQuery, terms }}
    >
      {children}
    </DailySearchContext.Provider>
  )
}

function SearchField({
  className,
  autoFocus = false,
  onEscape,
}: {
  className?: string
  autoFocus?: boolean
  onEscape?: () => void
}) {
  const { query, setQuery } = useDailySearch()

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <HugeiconsIcon
        icon={Search01Icon}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
      <Input
        type="text"
        role="searchbox"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setQuery("")
            onEscape?.()
          }
        }}
        placeholder="搜索来源、标题、副标题、标签"
        aria-label="搜索情报"
        aria-controls="daily-results"
        autoComplete="off"
        autoFocus={autoFocus}
        className="h-10 rounded-full border-border/70 bg-background/55 pr-9 pl-9 text-xs"
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="清除关键词"
          className="absolute top-1.5 right-1 z-10 text-muted-foreground"
          onClick={() => setQuery("")}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
        </Button>
      ) : null}
    </div>
  )
}

/**
 * 搜索框固定在同一行筛选栏最右侧。
 * 桌面直接展示输入框；窄屏只展示图标，点击后用同一行的覆盖层展开输入框。
 */
export function DailySearchInput() {
  const { query } = useDailySearch()
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="搜索情报"
        aria-expanded={open}
        aria-controls="daily-results"
        className={cn("shrink-0 sm:hidden", query && "bg-muted text-foreground")}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} className="size-4" strokeWidth={2} />
      </Button>

      {open ? (
        <div className="absolute inset-0 z-20 flex items-center gap-2 bg-background px-0 sm:hidden">
          <SearchField
            autoFocus
            className="flex-1"
            onEscape={() => setOpen(false)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(false)}
          >
            取消
          </Button>
        </div>
      ) : null}

      <SearchField className="hidden w-56 shrink-0 sm:block lg:w-72" />
    </>
  )
}

export function DailyResultCount() {
  const { items, filtered, terms } = useDailySearch()

  return (
    <p
      aria-live="polite"
      className="hidden shrink-0 text-[11px] text-muted-foreground tabular-nums md:block"
    >
      {terms.length > 0 ? `搜索到 ${filtered.length} 条` : `${items.length} 条`}
    </p>
  )
}
