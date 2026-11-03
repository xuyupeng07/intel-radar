import Link from "next/link"

import type { BriefEntry } from "@/lib/server/brief-archive"
import { cn } from "@/lib/utils"

export function BriefHistory({
  entries,
  activeId,
  variant,
}: {
  entries: BriefEntry[]
  activeId: string
  variant: "rail" | "strip"
}) {
  if (variant === "strip") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-muted-foreground">历史日报</h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {entries.length} 期
          </span>
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {entries.map((entry) => {
            const active = entry.brief.id === activeId
            return (
              <Link
                key={entry.brief.id}
                href={`/briefs?id=${entry.brief.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 flex-col gap-0.5 rounded-lg border px-2.5 py-1.5",
                  active
                    ? "border-foreground/15 bg-muted/60"
                    : "bg-card text-muted-foreground hover:bg-muted/40"
                )}
              >
                <span className="text-[11px] tabular-nums">
                  {entry.brief.date.slice(5)} {entry.brief.weekday}
                </span>
                <span className="max-w-40 truncate text-xs font-medium text-foreground">
                  {entry.brief.title}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between border-b pb-2">
        <h2 className="text-xs font-medium text-foreground">历史日报</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {entries.length} 期
        </span>
      </div>
      <nav className="mt-1 flex flex-col">
        {entries.map((entry) => {
          const active = entry.brief.id === activeId
          return (
            <Link
              key={entry.brief.id}
              href={`/briefs?id=${entry.brief.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group border-l-2 py-2.5 pr-1 pl-3 transition-colors",
                active
                  ? "border-primary"
                  : "border-transparent hover:border-border"
              )}
            >
              <span className="flex items-center justify-between gap-2 text-[11px]">
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {entry.brief.date.slice(5)} {entry.brief.weekday}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 block line-clamp-2 text-xs leading-snug",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {entry.brief.title}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
