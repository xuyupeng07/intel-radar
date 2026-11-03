import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SectionBadge } from "@/components/intel/bits"
import { SourceFavicon } from "@/components/intel/daily/source-favicon"
import type { IntelItem } from "@/lib/intel"
import { cn } from "@/lib/utils"

function publishedLabel(item: IntelItem): string {
  const time = item.sources[0]?.time ?? ""
  if (/^\d{2}-\d{2}$/.test(time)) {
    return `${item.date.slice(0, 4)}/${time.replace("-", "/")}`
  }
  return item.date.replaceAll("-", "/")
}

export function DailyCard({
  item,
  seq,
  featured = false,
}: {
  item: IntelItem
  seq: number
  featured?: boolean
}) {
  const source = item.sources[0]

  return (
    <a
      href={source?.url ?? "#"}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`查看详情：${item.title}`}
      className={cn(
        "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/65 bg-card/70 p-5 shadow-[0_1px_0_0_oklch(1_0_0/0.04)_inset] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        featured &&
          "md:col-span-2 xl:col-span-3 bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklab,var(--primary)_10%,var(--card))_0%,var(--card)_48%,color-mix(in_oklab,var(--card)_78%,transparent)_100%)] p-6 md:p-7 xl:p-8"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      {featured ? (
        <span
          aria-hidden
          className="text-display pointer-events-none absolute -right-2 -bottom-10 text-[15rem] leading-none text-foreground/[0.045] tabular-nums select-none"
        >
          {String(seq).padStart(2, "0")}
        </span>
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <SourceFavicon
            site={source?.site ?? ""}
            icon={source?.icon}
            className="size-6 rounded-full ring-1 ring-border/60"
          />
          <span className="truncate">{source?.site}</span>
          <span aria-hidden className="shrink-0 text-muted-foreground/35">
            /
          </span>
          <span className="shrink-0 tabular-nums">{publishedLabel(item)}</span>
        </div>
        {featured ? (
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[9px] font-medium tracking-[0.16em] text-primary uppercase">
            Top signal
          </span>
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 text-[10px] text-muted-foreground tabular-nums">
            {String(seq).padStart(2, "0")}
          </span>
        )}
      </div>

      <h2
        title={item.title}
        className={cn(
          "relative mt-4 line-clamp-2 leading-[1.15] font-medium break-words",
          featured
            ? "text-display max-w-2xl text-[clamp(1.8rem,3.2vw,2.8rem)]"
            : "text-[1.06rem] leading-snug"
        )}
      >
        {item.title}
      </h2>
      <p
        className={cn(
          "relative mt-2.5 text-muted-foreground break-words",
          featured
            ? "line-clamp-3 max-w-2xl text-sm leading-7"
            : "line-clamp-3 text-xs leading-relaxed"
        )}
      >
        {item.summary}
      </p>

      <div className="relative mt-auto flex items-center justify-between gap-2 pt-5">
        <SectionBadge section={item.section} short />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground transition-all duration-300 group-hover:border-primary/30 group-hover:text-foreground">
          查看详情
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3" strokeWidth={2} />
        </span>
      </div>
    </a>
  )
}
