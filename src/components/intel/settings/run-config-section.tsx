"use client"

import * as React from "react"
import { Calendar03Icon, Clock01Icon, RepeatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FieldRow } from "@/components/intel/settings/field-row"
import { InfoTip } from "@/components/intel/settings/info-tip"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TONE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"

const WEEKDAYS = [
  { value: 1, label: "一", title: "周一" },
  { value: 2, label: "二", title: "周二" },
  { value: 3, label: "三", title: "周三" },
  { value: 4, label: "四", title: "周四" },
  { value: 5, label: "五", title: "周五" },
  { value: 6, label: "六", title: "周六" },
  { value: 7, label: "日", title: "周日" },
]

function dayLabel(days: number[]): string {
  if (days.length === 7) return "每天"
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) {
    return "工作日"
  }
  return days
    .map((day) => WEEKDAYS.find((item) => item.value === day)?.title ?? "")
    .filter(Boolean)
    .join("、")
}

export function RunConfigSection({
  scheduleEnabled,
  scheduleTime,
  scheduleDays,
  scheduleCatchUp,
  lookbackDays,
  searchCount,
  itemLimit,
  briefItemLimit,
  maxResults,
  onSearchCountChange,
}: {
  scheduleEnabled: boolean
  scheduleTime: string
  scheduleDays: number[]
  scheduleCatchUp: boolean
  lookbackDays: number
  searchCount: number
  itemLimit: number
  briefItemLimit: number
  maxResults: number
  onSearchCountChange: (value: number) => void
}) {
  const [enabled, setEnabled] = React.useState(scheduleEnabled)
  const [time, setTime] = React.useState(scheduleTime)
  const [days, setDays] = React.useState<number[]>(scheduleDays)
  const [catchUp, setCatchUp] = React.useState(scheduleCatchUp)

  function toggleDay(day: number) {
    setDays((previous) =>
      previous.includes(day)
        ? previous.filter((item) => item !== day)
        : [...previous, day].sort((a, b) => a - b)
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium">运行配置</h2>
        <InfoTip label="运行配置说明">
          自动运行由服务端调度器按 Asia/Shanghai 时区触发；Next server 需要保持运行。
        </InfoTip>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Calendar03Icon} className="size-4" strokeWidth={2} />
            自动运行
            <Badge
              variant="outline"
              className={cn(
                "ml-auto h-5 rounded-full px-2 text-[10px]",
                enabled ? TONE_CLASS.success : TONE_CLASS.neutral
              )}
            >
              {enabled ? "已开启" : "未开启"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <HugeiconsIcon icon={RepeatIcon} className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">每日定时执行</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {enabled ? `${dayLabel(days)} ${time} · Asia/Shanghai` : "保存后不会自动运行"}
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="启用每日自动运行"
            />
          </div>
          <input type="hidden" name="scheduleEnabled" value={enabled ? "on" : ""} />

          <FieldRow
            label="执行时间"
            hint="每天在这个时间触发采集与日报；按 Asia/Shanghai 时区计算。"
            htmlFor="scheduleTime"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="scheduleTime"
                name="scheduleTime"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-10 w-[150px] tabular-nums"
                required
              />
              <span className="text-[11px] text-muted-foreground">Asia/Shanghai</span>
            </div>
          </FieldRow>

          <div className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:gap-6">
            <div className="flex items-center gap-1.5 pt-1.5">
              <span className="text-sm font-medium">运行日</span>
              <InfoTip label="运行日说明">
                只会在选中的星期触发；至少选择一个运行日。
              </InfoTip>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = days.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    title={day.title}
                    aria-pressed={active}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-8 min-w-9 rounded-full border px-2.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary font-medium text-primary-foreground"
                        : "border-border/70 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
          {days.map((day) => (
            <input key={day} type="hidden" name="scheduleDays" value={day} />
          ))}

          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-sm font-medium">错过补跑</span>
              <InfoTip label="错过补跑说明">
                服务在计划时间之后启动时，当天补跑一次；只影响当天，不会重复执行。
              </InfoTip>
            </div>
            <Switch
              checked={catchUp}
              onCheckedChange={setCatchUp}
              aria-label="服务重启后补跑当天任务"
            />
          </div>
          <input type="hidden" name="scheduleCatchUp" value={catchUp ? "on" : ""} />
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Clock01Icon} className="size-4" strokeWidth={2} />
            采集与日报范围
            <InfoTip label="采集与日报范围说明">
              这些值同时决定每轮采集的候选量和日报引用范围。
            </InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldRow
            label="回看窗口"
            hint="1 表示近 24 小时，最多 7 天；采集与日报共用这个时间范围。"
            htmlFor="lookbackDays"
          >
            <Input
              id="lookbackDays"
              name="lookbackDays"
              type="number"
              min={1}
              max={7}
              defaultValue={lookbackDays}
              className="max-w-[120px] tabular-nums"
              required
            />
          </FieldRow>

          <FieldRow
            label="每条检索词"
            hint={`向每个启用的搜索源请求的结果数，1–${maxResults} 条；多条源按最严格上限收敛。`}
            htmlFor="searchCount"
          >
            <Input
              id="searchCount"
              name="searchCount"
              type="number"
              min={1}
              max={maxResults}
              value={searchCount === 0 ? "" : searchCount}
              onChange={(event) =>
                onSearchCountChange(
                  event.target.value === "" ? 0 : Number(event.target.value)
                )
              }
              className="max-w-[120px] tabular-nums"
              required
            />
          </FieldRow>

          <FieldRow
            label="每日情报上限"
            hint="去重后最多保留多少条进入每日情报，30–120。"
            htmlFor="itemLimit"
          >
            <Input
              id="itemLimit"
              name="itemLimit"
              type="number"
              min={30}
              max={120}
              defaultValue={itemLimit}
              className="max-w-[120px] tabular-nums"
              required
            />
          </FieldRow>

          <FieldRow
            label="日报引用上限"
            hint="日报最多引用多少条情报，20–80；超出部分仍留在每日情报。"
            htmlFor="briefItemLimit"
          >
            <Input
              id="briefItemLimit"
              name="briefItemLimit"
              type="number"
              min={20}
              max={80}
              defaultValue={briefItemLimit}
              className="max-w-[120px] tabular-nums"
              required
            />
          </FieldRow>

          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4 text-xs">
            <span className="text-muted-foreground">运行内容</span>
            <span className="inline-flex items-center gap-1.5">
              采集 → 去重分类 → 日报
              <InfoTip label="运行内容说明">
                当前一轮任务固定包含搜索、分类去重和日报生成；失败会写入运行记录。
              </InfoTip>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
