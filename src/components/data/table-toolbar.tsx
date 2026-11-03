"use client"

import * as React from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * 列表页工具栏：左边切换（可横向滚动 + 右侧渐隐），右边搜索与动作。
 * 页面不再自己拼 CardHeader + 搜索框 + 渐隐层。
 */
export function TableToolbar({
  tabs,
  search,
  actions,
  className,
}: {
  tabs?: React.ReactNode
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
  }
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <CardHeader
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-4 xl:flex-row xl:items-center xl:justify-between",
        className
      )}
    >
      {tabs ? (
        <div className="relative w-full min-w-0">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">{tabs}</div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent"
          />
        </div>
      ) : null}

      {search || actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <div className="relative w-full min-w-0 flex-1 sm:w-60 sm:flex-none">
              <HugeiconsIcon
                icon={Search01Icon}
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
              <Input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder}
                aria-label={search.label ?? search.placeholder ?? "搜索"}
                className="h-9 pl-8"
              />
            </div>
          ) : null}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </CardHeader>
  )
}
