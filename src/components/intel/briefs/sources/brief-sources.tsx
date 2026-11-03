"use client"

import * as React from "react"

import { ChatSources } from "@/components/intel/briefs/sources/chat-sources"
import { SearchResultsPanel } from "@/components/intel/briefs/sources/search-results-panel"
import type { ChatSource } from "@/components/intel/briefs/sources/source-types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * 日报底部的来源入口：和 opensystem 的 AI 对话一致，
 * 点击「来源自 N 个网页」从右侧打开来源面板。
 */
export function BriefSources({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = React.useState(false)

  if (sources.length === 0) return null

  return (
    <div id="sources" className="scroll-mt-6">
      <ChatSources
        sources={sources}
        variant="footer"
        active={open}
        onOpen={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>搜索结果</SheetTitle>
          </SheetHeader>
          <SearchResultsPanel
            sources={sources}
            onClose={() => setOpen(false)}
            className="border-l-0"
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
