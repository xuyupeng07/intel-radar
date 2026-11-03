"use client"

import * as React from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FieldRow } from "@/components/intel/settings/field-row"
import { InfoTip } from "@/components/intel/settings/info-tip"
import { SegmentedControl } from "@/components/segmented-control"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  buildDeepSeekQuery,
  isoMinusDays,
  shanghaiTodayISO,
  syntaxTokens,
  type DeepSeekSyntax,
} from "@/lib/deepseek-query"
import {
  searchProviderNames,
  type SearchProviderId,
} from "@/lib/search-providers"
import type { SearchLang } from "@/lib/settings"
import { TONE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"

const LANG_OPTIONS = [
  { value: "zh", label: "中文 zh" },
  { value: "en", label: "英文 en" },
  { value: "zh,en", label: "中英 zh,en" },
]

/** 四个语法输入框：站点与短语各两个，保存后直接拼进 DeepSeek query。 */
const SYNTAX_FIELDS: {
  key: keyof DeepSeekSyntax
  name: string
  label: string
  hint: string
  placeholder: string
}[] = [
  {
    key: "includeSites",
    name: "deepseekIncludeSites",
    label: "限定站点",
    hint: "只在这些站点里检索，拼成 site:github.com；多个用逗号或空格分隔，最多 8 个。",
    placeholder: "github.com, 36kr.com",
  },
  {
    key: "excludeSites",
    name: "deepseekExcludeSites",
    label: "排除站点",
    hint: "把这些站点排除掉，拼成 -site:example.com；格式同「限定站点」。",
    placeholder: "example.com",
  },
  {
    key: "exactPhrase",
    name: "deepseekExactPhrase",
    label: "精确短语",
    hint: "要求原文出现这一串，拼成 \"精确短语\"（引号由系统补），最多 40 字。",
    placeholder: "端侧推理",
  },
  {
    key: "excludePhrase",
    name: "deepseekExcludePhrase",
    label: "排除短语",
    hint: "过滤掉含这串的结果，例如传闻、招聘；拼成 -\"传闻\"。",
    placeholder: "传闻",
  },
]

function QuerySyntaxField({
  field,
  value,
  onChange,
}: {
  field: (typeof SYNTAX_FIELDS)[number]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={field.name} className="text-xs font-medium">
          {field.label}
        </Label>
        <InfoTip label={`${field.label}说明`}>{field.hint}</InfoTip>
      </div>
      <Input
        id={field.name}
        name={field.name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="h-9 font-mono text-xs"
      />
    </div>
  )
}

export function RetrievalSection({
  providerIds,
  queries,
  lang,
  lookbackDays,
  syntax,
  onLangChange,
}: {
  providerIds: SearchProviderId[]
  queries: string[]
  lang: SearchLang
  lookbackDays: number
  syntax: DeepSeekSyntax
  onLangChange: (value: SearchLang) => void
}) {
  const providerNames = searchProviderNames(providerIds)
  const providerLabel =
    providerNames.length > 0 ? providerNames.join(" / ") : "未启用搜索源"

  // 检索词与语法都做成受控，下面的预览才能跟着实时变化。
  const [queryText, setQueryText] = React.useState(() => queries.join("\n"))
  const [deepseekSyntax, setDeepseekSyntax] =
    React.useState<DeepSeekSyntax>(syntax)
  const [after] = React.useState(() =>
    isoMinusDays(shanghaiTodayISO(), Math.max(1, lookbackDays))
  )

  const queryLines = queryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const firstQuery = queryLines[0] ?? ""
  const tokens = syntaxTokens(deepseekSyntax)
  const preview = buildDeepSeekQuery(firstQuery || "（第一条检索词）", {
    syntax: deepseekSyntax,
    lang,
    after,
  })

  function updateSyntax(key: keyof DeepSeekSyntax, value: string) {
    setDeepseekSyntax((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">检索参数</h2>
          <InfoTip label="检索参数说明">
            检索词、搜索语法、时间窗口与条数会直接进入下一轮采集。
          </InfoTip>
        </div>
        <span className="max-w-full truncate text-[11px] text-muted-foreground">
          当前启用：{providerLabel}
        </span>
      </div>

      <Card className="gap-4">
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Search01Icon} className="size-4" strokeWidth={2} />
            检索词
            <InfoTip label="检索词规则">
              每行一条，最多 8 条；空行会被忽略，重复行会自动去重。
            </InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldRow
            label="检索词"
            hint="用一句话描述你要盯住的行业变化；语言与日期会按下面的设置自动附加。"
            htmlFor="queries"
          >
            <Textarea
              id="queries"
              name="queries"
              rows={8}
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              className="font-mono text-xs leading-relaxed"
              placeholder="央行 货币政策 流动性 金融监管 最新消息"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              当前 {queryLines.length} 条
            </p>
          </FieldRow>

          <div className="flex flex-col gap-4 border-t pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">搜索语法</h3>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] leading-none",
                  TONE_CLASS.neutral
                )}
              >
                仅 DeepSeek
              </span>
              <InfoTip label="搜索语法说明">
                填好的条件会自动拼到每条检索词后面，只对 DeepSeek Search 生效；
                博查、秘塔与 Tavily 靠自然语言理解，不读这套操作符。
              </InfoTip>
            </div>

            {providerIds.includes("deepseek") ? null : (
              <div
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed",
                  TONE_CLASS.warning
                )}
              >
                当前没有启用 DeepSeek Search，这组语法不会进入任何请求。
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {SYNTAX_FIELDS.map((field) => (
                <QuerySyntaxField
                  key={field.name}
                  field={field}
                  value={deepseekSyntax[field.key]}
                  onChange={(value) => updateSyntax(field.key, value)}
                />
              ))}
            </div>

            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  发出的 query 预览
                </span>
                <span className="text-[10px] text-muted-foreground/80 tabular-nums">
                  {tokens.length > 0
                    ? `${tokens.length} 个自定义操作符 · `
                    : ""}
                  自动附加 lang:{lang} after:{after}
                </span>
              </div>
              <code className="mt-2 block break-all rounded-md border border-border/60 bg-background/70 px-2 py-1.5 font-mono text-[11px] leading-relaxed">
                {preview}
              </code>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                预览取第一条检索词；<code>lang</code> 来自「搜索语言」，<code>after</code>{" "}
                由「时间窗口」（回看 {lookbackDays} 天）自动算出，不用手填。
              </p>
            </div>
          </div>

          <div className="border-t pt-5">
            <FieldRow
              label="搜索语言"
              hint="只有 DeepSeek 会附加 lang 操作符；其他源按检索词本身的语言返回。"
              htmlFor="searchLang"
            >
              <input type="hidden" name="searchLang" value={lang} />
              <SegmentedControl
                options={LANG_OPTIONS}
                value={lang}
                onValueChange={(value) => onLangChange(value as SearchLang)}
                className="w-max"
              />
            </FieldRow>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
