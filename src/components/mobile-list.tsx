"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 移动端数据行的统一骨架。
 *
 * 后台表格在窄屏上只有两个选择：横向滚动（信息看不全、没有滚动提示）
 * 或者降级成"记录列表"。这里统一后者，保证所有页面的移动端行长得一样：
 * 左边是身份（头像/主标题/次要信息），右边是数值与状态。
 */
function MobileList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="mobile-list"
      className={cn("divide-y divide-border", className)}
      {...props}
    />
  )
}

function MobileRow({
  leading,
  title,
  description,
  meta,
  trailing,
  action,
  onSelect,
  className,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  action?: React.ReactNode
  onSelect?: () => void
  className?: string
}) {
  const interactive = Boolean(onSelect)

  return (
    <div
      data-slot="mobile-row"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors outline-none",
        interactive &&
          "cursor-pointer focus-visible:bg-muted/60 active:bg-muted/60",
        className
      )}
    >
      {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
            {meta}
          </p>
        ) : null}
      </div>

      {trailing || action ? (
        <div
          className="flex shrink-0 flex-col items-end gap-1.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {trailing}
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { MobileList, MobileRow }
