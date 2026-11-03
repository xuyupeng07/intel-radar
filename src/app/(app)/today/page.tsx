import type { Metadata } from "next"
import Link from "next/link"

import { EmptyIllustration } from "@/components/intel/empty-illustration"
import { CardDatePicker } from "@/components/intel/daily/card-date-picker"
import { DailyFeed } from "@/components/intel/daily/daily-feed"
import {
  DailyResultCount,
  DailySearchInput,
  DailySearchProvider,
} from "@/components/intel/daily/daily-search"
import { PageContainer, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  SECTIONS,
  SECTION_META,
  sectionBySlug,
  type IntelItem,
  type SectionFilter,
} from "@/lib/intel"
import { getDailyData } from "@/lib/server/daily-data"
import { todayInShanghai } from "@/lib/server/time"
import { getActiveWorkspace } from "@/lib/server/workspace"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "每日情报" }
export const dynamic = "force-dynamic"

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function searchTextFor(item: IntelItem): string {
  return [
    item.title,
    item.summary,
    item.section,
    SECTION_META[item.section]?.short ?? item.section,
    ...item.entities,
    ...item.sources.flatMap((source) => [source.site, sourceHost(source.url)]),
  ]
    .join(" ")
    .toLowerCase()
}

function buildHref(date: string, section: SectionFilter, defaultDate: string) {
  const params = new URLSearchParams()
  if (date !== defaultDate) params.set("date", date)
  if (section !== "all") params.set("section", SECTION_META[section].slug)
  const query = params.toString()
  return query ? `/today?${query}` : "/today"
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; section?: string }>
}) {
  const { date, section } = await searchParams
  const iso = /^\d{4}-\d{2}-\d{2}$/
  const workspace = await getActiveWorkspace()
  const data = await getDailyData(workspace.id)
  // 空工作区没有任何日期时，退回真实的今天（而不是演示数据里的固定日期）
  const fallbackDate = data.dates[0] ?? todayInShanghai()
  const activeDate = date && iso.test(date) ? date : fallbackDate
  const activeSection: SectionFilter = sectionBySlug(section) ?? "all"

  const dayItems = data.items.filter((item) => item.date === activeDate)
  const sectionCounts = SECTIONS.map((name) => ({
    section: name,
    count: dayItems.filter((item) => item.section === name).length,
  }))
  const visible =
    activeSection === "all"
      ? dayItems
      : dayItems.filter((item) => item.section === activeSection)
  const sorted = [...visible].sort(
    (a, b) => b.importance - a.importance || b.score - a.score
  )
  const searchable = sorted.map((item) => ({
    ...item,
    searchText: searchTextFor(item),
  }))
  const emptyVariant =
    data.dates.length === 0
      ? "empty"
      : dayItems.length === 0
        ? "no-data"
        : "searching"
  const siteCount = new Set(
    dayItems.flatMap((item) => item.sources.map((source) => source.site))
  ).size
  const activeSections = sectionCounts.filter((item) => item.count > 0).length
  const dateLabel = activeDate.replaceAll("-", ".")
  const stats = [
    { value: dayItems.length, label: "条情报" },
    { value: activeSections, label: "个板块" },
    { value: siteCount, label: "个来源" },
    { value: data.dates.length, label: "天有数据" },
  ]

  return (
    <PageContainer>
      <section className="grain animate-rise relative overflow-hidden pt-2 pb-10 md:pt-4 md:pb-12">
        <div aria-hidden className="aurora pointer-events-none absolute -top-52 -right-40 size-[36rem] opacity-70" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,color-mix(in_oklab,var(--card)_72%,transparent)_55%,transparent_82%)]" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
                <span className="size-1.5 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]" />
                Daily signal
              </span>
              <span className="eyebrow tabular-nums">{dateLabel} · {workspace.industry}</span>
            </div>
          </div>

          <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
            <div>
              <h1 className="text-display max-w-4xl text-[clamp(2.8rem,6.8vw,6.4rem)] leading-[0.92]">
                {dayItems.length > 0 ? (
                  <>
                    <span className="block sm:whitespace-nowrap">
                      今天，<span className="text-display-italic text-signal">值得知道</span>
                    </span>
                    <span className="block">
                      的 {dayItems.length} 个信号<span className="text-signal">.</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block sm:whitespace-nowrap">今天，等待</span>
                    <span className="block">
                      <span className="text-display-italic text-signal">第一个信号</span>
                      <span className="text-signal">.</span>
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                {workspace.industry}领域的每日切片。从 {siteCount || 0} 个来源里筛出真正
                值得知道的变化，再由 AI 归并成一篇有出处的日报。
              </p>

              <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-2">
                    <span className="text-display text-3xl leading-none tabular-nums">
                      {stat.value}
                    </span>
                    <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto hidden aspect-square w-full max-w-[260px] xl:block">
              <div className="absolute inset-0 rounded-full border border-border/70" />
              <div className="absolute inset-5 rounded-full border border-border/50" />
              <div className="absolute inset-10 rounded-full border border-dashed border-border/60" />
              <div className="aurora absolute inset-12 rounded-full opacity-60 blur-2xl" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="eyebrow">Signals / today</span>
                <span className="text-display mt-2 text-[4.7rem] leading-none tabular-nums">
                  {String(dayItems.length).padStart(2, "0")}
                </span>
                <span className="mt-2 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  curated signals
                </span>
              </div>
              <span className="absolute top-6 right-5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] tracking-[0.18em] text-primary uppercase">
                Live
              </span>
              <span className="absolute bottom-10 left-2 rounded-full border border-border/70 bg-background/65 px-2 py-0.5 text-[9px] tracking-[0.14em] text-muted-foreground uppercase backdrop-blur">
                {activeSections} sections
              </span>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
      </section>

      <DailySearchProvider
        key={`${activeDate}-${activeSection}`}
        items={searchable}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/60 px-2.5 py-2 shadow-lift backdrop-blur-xl sm:flex-nowrap">
            <CardDatePicker
              date={activeDate}
              sectionSlug={
                activeSection === "all" ? undefined : SECTION_META[activeSection].slug
              }
              daysWithData={data.dates.length}
              defaultDate={fallbackDate}
              today={todayInShanghai()}
            />
            <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
            <div className="scrollbar-none relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-6">
              <Link
                href={buildHref(activeDate, "all", fallbackDate)}
                aria-current={activeSection === "all" ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-colors",
                  activeSection === "all"
                    ? "bg-primary font-medium text-primary-foreground shadow-[0_0_20px_-8px_var(--primary)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                全部板块{" "}
                <span className="text-[11px] tabular-nums opacity-70">
                  {dayItems.length}
                </span>
              </Link>
              {sectionCounts.map((item) => {
                const meta = SECTION_META[item.section]
                const active = activeSection === item.section
                const className = cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] transition-colors",
                  active
                    ? "bg-primary font-medium text-primary-foreground shadow-[0_0_20px_-8px_var(--primary)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  item.count === 0 && "cursor-not-allowed opacity-40 hover:bg-transparent"
                )
                return item.count === 0 ? (
                  <span key={item.section} className={className}>
                    {meta.short}{" "}
                    <span className="text-[11px] tabular-nums opacity-70">{item.count}</span>
                  </span>
                ) : (
                  <Link
                    key={item.section}
                    href={buildHref(activeDate, item.section, fallbackDate)}
                    aria-current={active ? "page" : undefined}
                    className={className}
                  >
                    {meta.short}{" "}
                    <span className="text-[11px] tabular-nums opacity-70">{item.count}</span>
                  </Link>
                )
              })}
            </div>
            <DailyResultCount />
            {sorted.length > 0 ? <DailySearchInput /> : null}
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
              <EmptyIllustration variant={emptyVariant} />
              <p className="text-sm">
                {data.dates.length === 0
                  ? "这个工作区还没有情报"
                  : dayItems.length === 0
                    ? "这一天没有情报"
                    : "这个板块下没有情报"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.dates.length === 0
                  ? "先在设置里确认检索词，再到运营看板点「立即采集」。"
                  : dayItems.length === 0
                    ? "选一个最近有情报的日期看看"
                    : "换一个板块再看看"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                nativeButton={false}
                render={<Link href="/today" />}
              >
                清除筛选
              </Button>
            </div>
          ) : (
            <DailyFeed />
          )}
        </div>
      </DailySearchProvider>
    </PageContainer>
  )
}
