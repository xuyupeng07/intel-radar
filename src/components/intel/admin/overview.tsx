import Link from "next/link"
import {
  Calendar03Icon,
  News01Icon,
  PlayCircleIcon,
  Radar02Icon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { IngestButton } from "@/components/intel/ingest-button"
import { sectionShort } from "@/components/intel/bits"
import { PageContainer, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { searchProviderById } from "@/lib/search-providers"
import { getAdminOverview } from "@/lib/server/repositories/stats"
import {
  getProviderCredential,
  getProviderStates,
  getSettings,
} from "@/lib/server/repositories/settings"
import { getActiveWorkspace } from "@/lib/server/workspace"
import { syntaxSummary } from "@/lib/deepseek-query"
import { cn } from "@/lib/utils"

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  icon: typeof Radar02Icon
}) {
  return (
    <Card className="relative gap-0 overflow-hidden rounded-[1.5rem] border-border/65 bg-card/60 py-0 shadow-[0_1px_0_0_oklch(1_0_0/0.04)_inset]">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-36 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
          <span className="hidden size-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary sm:flex">
            <HugeiconsIcon icon={Icon} className="size-3.5" strokeWidth={2} />
          </span>
        </div>
        <p className="text-display text-4xl leading-none tabular-nums sm:text-5xl">
          {value}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export async function AdminOverview() {
  const workspace = await getActiveWorkspace()
  const [overview, settings, providers] = await Promise.all([
    getAdminOverview(workspace.id),
    getSettings(workspace.id),
    getProviderStates(workspace.id),
  ])
  const enabledProviders = settings.searchProviders.map(searchProviderById)
  const enabledReady = enabledProviders.filter((provider) =>
    providers.find((item) => item.id === provider.id)?.configured
  ).length
  const allProvidersReady =
    enabledProviders.length > 0 && enabledReady === enabledProviders.length
  const providerStatus =
    enabledProviders.length === 0
      ? "未启用"
      : allProvidersReady
        ? enabledProviders.length > 1
          ? "全部已配置"
          : "已配置"
        : `${enabledReady}/${enabledProviders.length} 已配置`
  const chatReady = Boolean(getProviderCredential(workspace.id, "deepseek"))
  const maxSection = Math.max(...overview.sections.map((item) => item.count), 1)
  const latestLabel = overview.latestDate
    ? overview.latestDate.replaceAll("-", ".")
    : "—"
  const runLabel =
    overview.runsOnLatestDate > 0
      ? `${overview.runsSucceeded} / ${overview.runsOnLatestDate}`
      : "—"

  return (
    <PageContainer>
      <PageHeader
        title="运营看板"
        description={`${workspace.name}的采集结果与运行数据汇总；执行明细统一放在运行记录。`}
      >
        <IngestButton label="立即采集" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric
          label="最新数据日"
          value={String(overview.latestItems)}
          hint={`${latestLabel} · 前一日 ${overview.previousItems} 条`}
          icon={Calendar03Icon}
        />
        <Metric
          label="有数据日累计"
          value={String(overview.items7d)}
          hint="全部有数据日期累计"
          icon={Radar02Icon}
        />
        <Metric
          label="检索词"
          value={`${settings.queries.length} 条`}
          hint="在设置里维护的检索式"
          icon={Search01Icon}
        />
        <Metric
          label="数据日运行"
          value={runLabel}
          hint="采集与日报生成成功数"
          icon={PlayCircleIcon}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">板块分布</CardTitle>
            <CardDescription className="text-xs">
              {latestLabel} 当天情报按板块统计
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {overview.sections.map((item) => (
              <div key={item.section} className="flex items-center gap-3">
                <span
                  className="w-7 shrink-0 text-[11px] text-muted-foreground"
                  title={item.section}
                >
                  {sectionShort(item.section)}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${(item.count / maxSection) * 100}%` }}
                  />
                </div>
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
            <p className="mt-1 border-t pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              当天合计 {overview.latestItems} 条；板块由模型分类，可在每日情报里按板块筛选。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">采集参数</CardTitle>
            <CardDescription className="text-xs">
              当前设置会直接用于下一轮多源检索
            </CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                nativeButton={false}
                render={<Link href="/settings" />}
              >
                <HugeiconsIcon icon={Settings01Icon} className="size-3" strokeWidth={2} />
                设置
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">搜索源</span>
              <span
                className="inline-flex min-w-0 items-center justify-end gap-1.5"
                title={enabledProviders.map((item) => item.name).join(" / ")}
              >
                <span className="truncate font-medium">{enabledProviders.length} 个</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5",
                    allProvidersReady
                      ? "text-emerald-600 dark:text-emerald-400"
                      : enabledReady > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {providerStatus}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">对话模型</span>
              <span className="font-mono text-[11px]">{settings.chatModel}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">对话 Key</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  chatReady
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {chatReady ? "已配置" : "未配置"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">检索词</span>
              <span className="tabular-nums">{settings.queries.length} 条</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">检索语法</span>
              <span className="truncate text-right">
                {syntaxSummary(settings.deepseekSyntax)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">时间范围</span>
              <span className="tabular-nums">近 {settings.lookbackDays} 天</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">每条检索词</span>
              <span className="tabular-nums">{settings.searchCount} 条结果</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">每日上限</span>
              <span className="tabular-nums">{settings.itemLimit} 条</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">自动运行</span>
              <span className="tabular-nums">
                {settings.scheduleEnabled
                  ? `${settings.scheduleDays.length === 7 ? "每天" : `${settings.scheduleDays.length} 天`} ${settings.scheduleTime}`
                  : "未开启"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">最新日报</span>
              <span className="tabular-nums">
                {overview.latestBriefDate?.replaceAll("-", ".") ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">最近采集</span>
              <span className="tabular-nums">
                {overview.lastIngest
                  ? `${overview.lastIngest.status} · ${overview.lastIngest.startedAt}`
                  : "—"}
              </span>
            </div>
            <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
              {overview.lastIngest
                ? overview.lastIngest.detail
                : "还没有采集记录。点「立即采集」会按设置里的检索词跑一轮完整流程。"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-dashed px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <HugeiconsIcon
          icon={News01Icon}
          className="mt-0.5 size-3.5 shrink-0"
          strokeWidth={2}
        />
        日报生成即发布，没有人工审核；采集量、板块分布与运行状态只在这里和运行记录中出现，读者页不展示。
      </div>
    </PageContainer>
  )
}
