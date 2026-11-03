import * as React from "react"
import {
  AlertCircleIcon,
  Settings01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { InfoTip } from "@/components/intel/settings/info-tip"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { syntaxSummary } from "@/lib/deepseek-query"
import {
  searchProviderById,
  type SearchProviderState,
} from "@/lib/search-providers"
import type { AppSettings } from "@/lib/settings"
import { TONE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        ok ? "bg-emerald-500" : "bg-amber-500"
      )}
    />
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

export function StatusSection({
  settings,
  providerStates,
  chatReady,
  lastIngestLabel,
}: {
  settings: AppSettings
  providerStates: SearchProviderState[]
  chatReady: boolean
  lastIngestLabel: string | null
}) {
  const enabledProviders = settings.searchProviders.map(searchProviderById)
  const enabledStates = enabledProviders.map((provider) => ({
    provider,
    state: providerStates.find((item) => item.id === provider.id),
  }))
  const readyCount = enabledStates.filter((item) => item.state?.configured).length
  const allReady =
    enabledStates.length > 0 && readyCount === enabledStates.length
  const langLabel =
    settings.searchLang === "zh,en"
      ? "中英 zh,en"
      : settings.searchLang === "en"
        ? "英文 en"
        : "中文 zh"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium">运行状态</h2>
        <InfoTip label="运行状态说明">
          这里只读；保存设置后下一轮采集按新配置执行。
        </InfoTip>
      </div>

      {!allReady ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed",
            TONE_CLASS.warning
          )}
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2}
          />
          <span>
            {enabledStates.length === 0
              ? "还没有启用搜索源，采集会直接失败。"
              : readyCount === 0
                ? "启用的搜索源都没有配置 Key，采集会直接失败。"
                : `${enabledStates.length - readyCount} 个启用的搜索源未配置 Key，采集会跳过它们。`}
          </span>
        </div>
      ) : null}

      {!chatReady ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed",
            TONE_CLASS.warning
          )}
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2}
          />
          <span>对话 Key 未配置，分类与日报会退化为规则版本。</span>
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="gap-4">
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={Wifi01Icon} className="size-4" strokeWidth={2} />
              连接状态
              <InfoTip label="连接状态说明">
                搜索源与对话接口是两条独立链路，分别校验。
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {enabledStates.length === 0 ? (
              <Row label="搜索源">
                <span className="text-muted-foreground">未启用</span>
              </Row>
            ) : (
              enabledStates.map(({ provider, state }) => (
                <Row key={provider.id} label={provider.name}>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot ok={Boolean(state?.configured)} />
                    {state?.configured ? "已配置" : "未配置"}
                  </span>
                </Row>
              ))
            )}
            <Row label="对话接口">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot ok={chatReady} />
                {chatReady ? "Key 已配置" : "Key 未配置"}
              </span>
            </Row>
            <Row label="最近采集">
              <span className="tabular-nums">
                {lastIngestLabel ?? "还没有记录"}
              </span>
            </Row>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HugeiconsIcon
                icon={Settings01Icon}
                className="size-4"
                strokeWidth={2}
              />
              本轮配置
              <InfoTip label="本轮配置说明">
                保存后下一轮采集读取这一组值。
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <Row label="检索词">
              <span className="tabular-nums">{settings.queries.length} 条</span>
            </Row>
            <Row label="每条结果">
              <span className="tabular-nums">{settings.searchCount} 条</span>
            </Row>
            <Row label="每日上限">
              <span className="tabular-nums">{settings.itemLimit} 条</span>
            </Row>
            <Row label="时间窗口">
              <span className="tabular-nums">近 {settings.lookbackDays} 天</span>
            </Row>
            <Row label="搜索语言">
              <span>{langLabel}</span>
            </Row>
            <Row label="搜索语法">
              <span>{syntaxSummary(settings.deepseekSyntax)}</span>
            </Row>
            <Row label="日报引用">
              <span className="tabular-nums">{settings.briefItemLimit} 条</span>
            </Row>
            <Row label="搜索源">
              <span className="tabular-nums">
                {settings.searchProviders.length} 个
              </span>
            </Row>
            <Row label="自动运行">
              <span className="tabular-nums">
                {settings.scheduleEnabled
                  ? `${settings.scheduleDays.length === 7 ? "每天" : `${settings.scheduleDays.length} 天`} ${settings.scheduleTime}`
                  : "未开启"}
              </span>
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
