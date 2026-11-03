"use client"

import * as React from "react"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

/** 超过 7 页时折叠中间页码，只留首尾与当前页附近。 */
function pageItems(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
  const items: (number | "gap")[] = [1]
  if (current > 3) items.push("gap")
  for (let page = Math.max(2, current - 1); page <= Math.min(count - 1, current + 1); page++) {
    items.push(page)
  }
  if (current < count - 2) items.push("gap")
  items.push(count)
  return items
}

/**
 * 列表页分页：条数说明 + 上一页 / 页码 / 下一页。
 * 页码只做展示，不写 URL —— 需要可分享的页码由页面自己写 query。
 * 业务单位不同用 `unit`（条 / 份 / 人），不要为一句文案复制整个组件。
 */
export function TablePagination({
  total,
  page,
  pageCount,
  onPageChange,
  className,
  unit = "条",
}: {
  total: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
  unit?: string
}) {
  const count = Math.max(1, pageCount)
  const current = Math.min(Math.max(1, page), count)
  const items = pageItems(current, count)

  const go = (next: number) => {
    if (next >= 1 && next <= count && next !== current) onPageChange(next)
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3",
        className
      )}
    >
      <p className="text-xs text-muted-foreground">
        共 {total} {unit} · 第 {current} / {count} 页
      </p>
      <Pagination aria-label="分页" className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="上一页"
              aria-disabled={current === 1}
              tabIndex={current === 1 ? -1 : undefined}
              onClick={(event) => {
                event.preventDefault()
                go(current - 1)
              }}
              className={cn(current === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          {items.map((item, index) =>
            item === "gap" ? (
              <PaginationItem key={`gap-${index}`}>
                <span className="px-1 text-xs text-muted-foreground">…</span>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={current === item}
                  onClick={(event) => {
                    event.preventDefault()
                    go(item)
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="下一页"
              aria-disabled={current === count}
              tabIndex={current === count ? -1 : undefined}
              onClick={(event) => {
                event.preventDefault()
                go(current + 1)
              }}
              className={cn(current === count && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
