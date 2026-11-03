"use client"

import * as React from "react"

import { SourceFavicon } from "@/components/intel/briefs/sources/source-favicon"
import type { ChatSource } from "@/components/intel/briefs/sources/source-types"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function formatSourceDate(value?: string | null) {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const match = trimmed.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) {
    return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`
  }

  return trimmed
}

export function SourceCitation({
  source,
  index,
}: {
  source: ChatSource
  index: number
}) {
  const siteName = source.siteName?.trim() || safeHost(source.url) || "来源"
  const date = formatSourceDate(source.date)
  const excerpt = source.snippet?.trim() || source.summary?.trim()
  const href = /^https?:\/\//i.test(source.url) ? source.url : undefined

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={80}
        render={
          <a
            href={href}
            target={href ? "_blank" : undefined}
            rel={href ? "noreferrer noopener" : undefined}
          />
        }
        aria-label={`查看来源 ${index}：${source.title}`}
        className="ml-1 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-[5px] border border-border bg-muted px-1 align-[1px] text-[11px] font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-muted-foreground/15 hover:text-foreground dark:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none dark:border-border dark:bg-muted dark:text-foreground/80"
      >
        {index}
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-popover p-4 text-popover-foreground shadow-xl"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
            <SourceFavicon
              url={source.url}
              siteName={source.siteName}
              iconUrl={source.siteIcon}
            />
            <span className="min-w-0 truncate">{siteName}</span>
            {date ? (
              <>
                <span className="shrink-0 text-muted-foreground/40">|</span>
                <span className="shrink-0 text-muted-foreground/80">
                  {date}
                </span>
              </>
            ) : null}
          </div>
          <p className="line-clamp-2 text-base font-semibold leading-6 text-foreground">
            {source.title.trim() || siteName}
          </p>
          {excerpt ? (
            <p className="line-clamp-4 text-[13px] leading-5 text-muted-foreground">
              {excerpt}
            </p>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
