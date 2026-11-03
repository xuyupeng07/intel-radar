import type { Metadata } from "next"
import { Notification03Icon, Share01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ActionButton } from "@/components/intel/action-button"
import { EmptyIllustration } from "@/components/intel/empty-illustration"
import { BriefBody } from "@/components/intel/briefs/brief-body"
import { BriefHistory } from "@/components/intel/briefs/brief-history"
import { BriefToc } from "@/components/intel/briefs/brief-toc"
import { PageContainer, PageHeader } from "@/components/page-header"
import { briefCoverage } from "@/lib/brief-coverage"
import { extractHeadings, markdownForReport, numberSectionHeadings } from "@/lib/brief-markdown"
import { getBriefArchive } from "@/lib/server/brief-archive"
import { getActiveWorkspace } from "@/lib/server/workspace"
import { BRAND_CHIP } from "@/lib/tone"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "日报" }
export const dynamic = "force-dynamic"

export default async function BriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const workspace = await getActiveWorkspace()
  const entries = await getBriefArchive(workspace.id)
  const active = entries.find((entry) => entry.brief.id === id) ?? entries[0]

  if (!active) {
    return (
      <PageContainer>
        <PageHeader
          title="日报"
          description={`${workspace.industry}领域每日日报 · 每日汇总当日情报，由 AI 整合成一篇综述，生成即发布。`}
        />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center">
          <EmptyIllustration variant="empty" />
          <p className="text-sm">这个工作区还没有日报</p>
          <p className="text-xs text-muted-foreground">
            先去运营看板点「立即采集」，生成后会出现在这里。
          </p>
        </div>
      </PageContainer>
    )
  }

  const { brief, report, items } = active
  const coverage = briefCoverage(items, brief.date)
  const markdown = numberSectionHeadings(markdownForReport(report))
  const toc = [
    ...extractHeadings(markdown).filter((heading) => heading.label !== "来源"),
    { id: "sources", label: "来源" },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="日报"
        description={`${workspace.industry}领域每日日报 · 每日汇总当日情报，由 AI 整合成一篇综述，生成即发布。`}
      >
        <ActionButton variant="outline" size="sm" message="骨架阶段：分享尚未接入">
          <HugeiconsIcon icon={Share01Icon} className="size-3.5" strokeWidth={2} />
          分享
        </ActionButton>
        <ActionButton size="sm" message="骨架阶段：订阅尚未接入">
          <HugeiconsIcon icon={Notification03Icon} className="size-3.5" strokeWidth={2} />
          订阅日报
        </ActionButton>
      </PageHeader>

      <div className="lg:hidden">
        <BriefHistory entries={entries} activeId={brief.id} variant="strip" />
      </div>

      <BriefToc items={toc} variant="mobile" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[180px_minmax(0,1fr)_180px]">
        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 scrollbar-thin">
            <BriefToc items={toc} />
          </div>
        </aside>

        <article className="grain relative min-w-0 overflow-hidden rounded-[2rem] border border-border/65 bg-card/55 p-5 shadow-lift md:p-8 xl:p-10">
          <header className="relative z-10 pb-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 font-medium",
                  BRAND_CHIP
                )}
              >
                {brief.title.startsWith("周报")
                  ? `${workspace.industry}周报`
                  : workspace.briefLabel}
              </span>
              <span className="tabular-nums">
                {brief.date.replaceAll("-", ".")} {brief.weekday}
              </span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span>{brief.readMinutes} 分钟读完</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="tabular-nums">{brief.publishedAt} 发布</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span>{brief.items} 条情报</span>
              <span
                className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-1.5 py-0.5 text-[11px] tabular-nums sm:ml-auto"
                title={`本期覆盖 ${coverage}`}
              >
                <span className="text-muted-foreground">本期覆盖</span>
                <span className="text-foreground/80">{coverage}</span>
              </span>
            </div>
            <h2 className="text-display mt-5 max-w-4xl text-[clamp(2.6rem,5.2vw,4.8rem)] leading-[0.94] text-balance">
              {brief.title}
            </h2>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-muted-foreground">
              {brief.summary}
            </p>
          </header>

          <div className="relative z-10 mt-8">
            <BriefBody brief={brief} report={report} items={items} markdown={markdown} />
          </div>
        </article>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 scrollbar-thin">
            <BriefHistory entries={entries} activeId={brief.id} variant="rail" />
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}
