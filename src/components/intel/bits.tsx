import Link from "next/link"
import { CheckmarkCircle02Icon, Alert02Icon, Link01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import type { Section, SourceRef, Verification } from "@/lib/intel"
import { cn } from "@/lib/utils"

const SECTION_TONE: Record<Section, string> = {
  政策与监管: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-300",
  市场与趋势: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-300",
  公司与产品: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:border-blue-400/35 dark:bg-blue-400/10 dark:text-blue-300",
  资本与交易: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/35 dark:bg-violet-400/10 dark:text-violet-300",
  观点与研究: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-300",
  风险与异动: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/35 dark:bg-rose-400/10 dark:text-rose-300",
}

const SECTION_SHORT: Record<Section, string> = {
  政策与监管: "政策",
  市场与趋势: "市场",
  公司与产品: "公司",
  资本与交易: "资本",
  观点与研究: "观点",
  风险与异动: "风险",
}

export function SectionBadge({
  section,
  short = false,
  className,
}: {
  section: Section
  short?: boolean
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full border px-2 text-[10px] font-medium tracking-[0.06em]",
        SECTION_TONE[section],
        className
      )}
    >
      {short ? SECTION_SHORT[section] : section}
    </Badge>
  )
}

export function sectionShort(section: Section) {
  return SECTION_SHORT[section]
}

export function VerifyBadge({
  verification,
  withText = true,
}: {
  verification: Verification
  withText?: boolean
}) {
  if (verification === "unverified") {
    return (
      <Badge
        variant="outline"
        className="h-5 gap-1 rounded-md border-amber-500/25 bg-amber-500/10 px-1.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-300"
      >
        <HugeiconsIcon icon={Alert02Icon} className="size-3" strokeWidth={2} />
        待确认
      </Badge>
    )
  }

  if (verification === "single") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="size-1 rounded-full bg-muted-foreground/50" />
        单一来源
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" strokeWidth={2} />
      {withText ? "已多源印证" : null}
    </span>
  )
}

export function SourceChips({
  sources,
  max = 3,
  className,
}: {
  sources: SourceRef[]
  max?: number
  className?: string
}) {
  const shown = sources.slice(0, max)
  const rest = sources.length - shown.length

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1", className)}>
      {shown.map((source, index) => (
        <a
          key={`${source.site}-${source.time}-${index}`}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "inline-flex items-center gap-1 text-[11px] transition-colors hover:text-foreground hover:underline hover:underline-offset-2",
            source.primary ? "text-foreground/80" : "text-muted-foreground"
          )}
          title={`${source.site} · ${source.time}`}
        >
          {source.site}
          <span className="text-muted-foreground/60 tabular-nums">{source.time}</span>
        </a>
      ))}
      {rest > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
          <HugeiconsIcon icon={Link01Icon} className="size-3" strokeWidth={2} />+{rest}
        </span>
      ) : null}
    </span>
  )
}

export function Spark({
  values,
  className,
  tone = "primary",
}: {
  values: number[]
  className?: string
  tone?: "primary" | "muted"
}) {
  const max = Math.max(...values, 1)
  return (
    <span className={cn("inline-flex h-6 items-end gap-[3px]", className)} aria-hidden>
      {values.map((value, index) => (
        <span
          key={index}
          className={cn(
            "w-1.5 rounded-[2px]",
            tone === "primary"
              ? index === values.length - 1
                ? "bg-primary"
                : "bg-primary/25"
              : "bg-muted-foreground/25"
          )}
          style={{ height: `${Math.max(10, (value / max) * 100)}%` }}
        />
      ))}
    </span>
  )
}

const BRIEF_STATUS_TONE: Record<string, string> = {
  草稿: "border-border bg-muted text-muted-foreground",
  待审核: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-300",
  已发布: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-300",
  推送失败: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/35 dark:bg-rose-400/10 dark:text-rose-300",
}

/** 日报状态：四种状态固定配色，避免每个页面各写一套。 */
export function BriefStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 rounded-full border px-2 text-[11px] font-medium",
        BRIEF_STATUS_TONE[status] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "已发布"
            ? "bg-emerald-500"
            : status === "待审核"
              ? "bg-amber-500"
              : status === "推送失败"
                ? "bg-rose-500"
                : "bg-muted-foreground/50"
        )}
      />
      {status}
    </Badge>
  )
}

export function StatusDot({ status }: { status: string }) {
  const tone =
    status === "正常" || status === "启用" || status === "成功" || status === "已发送"
      ? "bg-emerald-500"
      : status === "波动" || status === "待审核" || status === "运行中"
        ? "bg-amber-500"
        : status === "失败" || status === "验证失败" || status === "推送失败"
          ? "bg-rose-500"
          : "bg-muted-foreground/40"

  return <span className={cn("size-1.5 shrink-0 rounded-full", tone)} />
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  )
}

/** 页内的小节标题：比 CardTitle 轻，用于列表与内容分组。 */
export function BlockTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium">{children}</h2>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
