"use client"

import * as React from "react"

import { DailyCard } from "@/components/intel/daily/daily-card"
import { EmptyIllustration } from "@/components/intel/empty-illustration"
import { useDailySearch } from "@/components/intel/daily/daily-search"
import { Button } from "@/components/ui/button"

export function DailyFeed() {
  const { filtered, setQuery } = useDailySearch()

  if (filtered.length === 0) {
    return (
      <div
        id="daily-results"
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center"
      >
        <EmptyIllustration />
        <p className="text-sm">没有找到匹配的情报</p>
        <p className="text-xs text-muted-foreground">
          试试来源、标题、副标题、板块或标签关键词。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={() => setQuery("")}
        >
          清除搜索
        </Button>
      </div>
    )
  }

  return (
    <div
      id="daily-results"
      className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {filtered.map((item, index) => (
        <DailyCard
          key={item.id}
          item={item}
          seq={index + 1}
          featured={index === 0 && filtered.length > 2}
        />
      ))}
    </div>
  )
}
