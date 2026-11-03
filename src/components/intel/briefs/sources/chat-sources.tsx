"use client"

import * as React from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SourceFavicon } from "@/components/intel/briefs/sources/source-favicon"
import type { ChatSource } from "@/components/intel/briefs/sources/source-types"
import { cn } from "@/lib/utils"

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function ChatSources({
  sources,
  onOpen,
  active = false,
  variant = "default",
}: {
  sources: ChatSource[]
  onOpen?: (sources: ChatSource[]) => void
  active?: boolean
  variant?: "default" | "footer"
}) {
  if (sources.length === 0) return null

  const footer = variant === "footer"
  const limit = footer ? 4 : 3
  const faviconSources: ChatSource[] = []
  const seenHosts = new Set<string>()

  for (const source of sources) {
    const host = safeHost(source.url)
    if (seenHosts.has(host)) continue
    seenHosts.add(host)
    faviconSources.push(source)
    if (faviconSources.length === limit) break
  }

  const favicons = (
    <span className="flex shrink-0 items-center -space-x-1.5">
      {faviconSources.map((source) => (
        <SourceFavicon
          key={source.url}
          url={source.url}
          siteName={source.siteName}
          iconUrl={source.siteIcon}
          className="size-4 rounded-full ring-2 ring-background"
        />
      ))}
    </span>
  )

  const content = footer ? (
    <>
      {favicons}
      <span className="truncate">
        <span className="text-muted-foreground/70">来源自</span> {sources.length} 个网页
      </span>
    </>
  ) : (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <HugeiconsIcon
          icon={Search01Icon}
          className="size-3.5"
          strokeWidth={2}
        />
      </span>
      <span className="truncate">搜索到 {sources.length} 个网页</span>
      {favicons}
    </>
  )

  const baseClassName =
    "inline-flex h-9 w-fit max-w-full items-center gap-2 rounded-full text-sm font-normal transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
  const className = footer
    ? cn(
        baseClassName,
        "bg-transparent py-1 pr-3.5 pl-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        active && "bg-muted/60 text-foreground"
      )
    : cn(
        baseClassName,
        "-ml-1 bg-transparent py-1 pr-2 pl-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        active && "bg-muted/60 text-foreground"
      )

  if (!onOpen) {
    return <div className={className}>{content}</div>
  }

  return (
    <button
      type="button"
      aria-expanded={active}
      aria-label={
        footer
          ? `查看来源，共 ${sources.length} 个网页`
          : `展开搜索结果，共 ${sources.length} 个网页`
      }
      className={cn(className, "cursor-pointer text-left")}
      onClick={() => onOpen(sources)}
    >
      {content}
    </button>
  )
}
