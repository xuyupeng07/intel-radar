"use client"

import * as React from "react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SourceFavicon } from "@/components/intel/briefs/sources/source-favicon"
import type { ChatSource } from "@/components/intel/briefs/sources/source-types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
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

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}`
  }

  return trimmed
}

export function SearchResultsPanel({
  sources,
  onClose,
  className,
}: {
  sources: ChatSource[]
  onClose: () => void
  className?: string
}) {
  return (
    <aside
      data-slot="search-results-panel"
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-l border-border/60 bg-background",
        className
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/50 px-5">
        <h2 className="text-sm font-medium text-foreground">搜索结果</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭搜索结果"
          className="-mr-1 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </header>

      {sources.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
          没有找到相关网页
        </div>
      ) : (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ol className="divide-y divide-border/50">
            {sources.map((source, index) => {
              const siteName = source.siteName?.trim() || safeHost(source.url)
              const date = formatSourceDate(source.date)
              const excerpt = source.snippet?.trim() || source.summary?.trim()
              const href = /^https?:\/\//i.test(source.url)
                ? source.url
                : undefined

              return (
                <li key={source.url}>
                  <a
                    href={href}
                    target={href ? "_blank" : undefined}
                    rel={href ? "noreferrer noopener" : undefined}
                    className="group block px-5 py-4 transition-colors hover:bg-muted/35"
                  >
                    <div className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                      <SourceFavicon
                        url={source.url}
                        siteName={source.siteName}
                        iconUrl={source.siteIcon}
                        className="size-4"
                      />
                      <span className="min-w-0 truncate">{siteName}</span>
                      {date ? (
                        <>
                          <span className="shrink-0 text-muted-foreground/40">
                            |
                          </span>
                          <span className="shrink-0 text-muted-foreground/80">
                            {date}
                          </span>
                        </>
                      ) : null}
                      <span className="ml-auto shrink-0 pl-2 text-[11px] tabular-nums text-muted-foreground/55">
                        {index + 1}
                      </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-foreground decoration-border underline-offset-4 group-hover:underline">
                      {source.title.trim() || siteName}
                    </h3>

                    {excerpt ? (
                      <p className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-muted-foreground">
                        {excerpt}
                      </p>
                    ) : null}
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </aside>
  )
}
