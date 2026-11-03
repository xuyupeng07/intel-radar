"use client"

import type { NavIconType } from "@/lib/nav"
import { HugeiconsIcon } from "@hugeicons/react"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"

export type SettingsNavItem = {
  value: string
  label: string
  icon: NavIconType
}

/**
 * 设置页左侧导航。
 *
 * 出处：opensystem 的 `components/settings/settings-nav.tsx`，抽成接收 items 的版本。
 * 结构是「胶囊容器 + 实心选中块」：`rounded-2xl bg-muted p-1.5` 包住全部 trigger，
 * 选中项用 `bg-nav-active`（浅色主题=白、深色=页面底色）浮起一层。
 * lg 以下整条折成横向滚动。
 *
 * 不要改用 `variant="line"` + 自绘下划线/竖线：纵向 Tabs 的指示器会画在
 * trigger 右缘，容器一宽就变成一条脱离文字、贯穿整列的孤线。
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  return (
    <TabsList className="flex h-fit w-full flex-row! justify-start gap-1 overflow-x-auto rounded-2xl bg-muted p-1.5 max-sm:justify-between lg:w-52 lg:flex-col!">
      {items.map((item) => (
        <TabsTrigger
          key={item.value}
          value={item.value}
          aria-label={item.label}
          title={item.label}
          className="w-auto! shrink-0 justify-start gap-2 rounded-full px-3 py-2 text-sm data-active:bg-nav-active! data-active:text-nav-active-foreground! max-sm:flex-1 max-sm:justify-center max-sm:px-0 lg:w-full!"
        >
          <HugeiconsIcon icon={item.icon} className="size-4" strokeWidth={2} />
          <span className="hidden whitespace-nowrap sm:inline">{item.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
