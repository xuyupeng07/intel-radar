"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CardStatus } from "@/components/intel/settings/card-status"
import { InfoTip } from "@/components/intel/settings/info-tip"
import { SecretField } from "@/components/intel/settings/secret-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  SEARCH_PROVIDERS,
  type SearchProviderId,
  type SearchProviderState,
} from "@/lib/search-providers"
import {
  revealProviderKeyAction,
  testSearchProviderAction,
} from "@/lib/server/actions/settings"
import { cn } from "@/lib/utils"

const EMPTY_FEEDBACK: Partial<
  Record<SearchProviderId, { ok: boolean; message: string }>
> = {}

function statusText(
  provider: (typeof SEARCH_PROVIDERS)[number],
  state: SearchProviderState | undefined
): string {
  if (state?.source === "env") {
    return "环境变量"
  }
  if (state?.source === "settings") {
    return "已保存"
  }
  return "未配置"
}

function keyPlaceholder(
  state: SearchProviderState | undefined,
  provider: (typeof SEARCH_PROVIDERS)[number]
): string {
  if (state?.source === "settings") return "输入新 Key，留空清除"
  if (state?.source === "env") return `留空沿用 ${provider.envKey}`
  return "粘贴 API Key"
}

export function SourcesSection({
  providers,
  value,
  onValueChange,
  resetToken,
}: {
  providers: SearchProviderState[]
  value: SearchProviderId[]
  onValueChange: (value: SearchProviderId[]) => void
  resetToken: string
}) {
  const [feedback, setFeedback] = React.useState(EMPTY_FEEDBACK)
  const [testing, setTesting] = React.useState<SearchProviderId | null>(null)
  const [, startTransition] = React.useTransition()

  // 保存成功后清掉上一次的连接测试结果。
  React.useEffect(() => {
    setFeedback(EMPTY_FEEDBACK)
  }, [resetToken])

  function runTest(id: SearchProviderId, trigger: HTMLButtonElement) {
    const form = trigger.closest("form")
    const input = form?.querySelector(
      `input[name="providerKey_${id}"]`
    ) as HTMLInputElement | null
    const typed = input?.value ?? ""
    const preview = providers.find((item) => item.id === id)?.keyPreview ?? ""

    setTesting(id)
    startTransition(async () => {
      try {
        const result = await testSearchProviderAction({
          providerId: id,
          // 输入框里是服务端下发的掩码时，不把它当 Key 发给测试接口。
          apiKey: typed === preview ? "" : typed,
        })
        setFeedback((previous) => ({ ...previous, [id]: result }))
      } catch (error) {
        setFeedback((previous) => ({
          ...previous,
          [id]: {
            ok: false,
            message: `连接失败：${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        }))
      } finally {
        setTesting(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">搜索源</h2>
          <InfoTip label="搜索源说明">
            可多选：启用的源会并行检索，单轮请求数按源数累加；至少启用一个。
          </InfoTip>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          已启用 {value.length} 个
        </span>
      </div>

      {value.map((id) => (
        <input key={id} type="hidden" name="searchProviders" value={id} />
      ))}

      <div className="grid gap-3 xl:grid-cols-2">
        {SEARCH_PROVIDERS.map((provider) => {
          const state = providers.find((item) => item.id === provider.id)
          const active = value.includes(provider.id)
          const result = feedback[provider.id]

          return (
            <Card
              key={`${provider.id}-${resetToken}`}
              className={cn(
                "gap-0 py-0 transition-[box-shadow,border-color] duration-200",
                active && "ring-2 ring-primary/35!"
              )}
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 ring-1 ring-black/5 dark:ring-white/15">
                    {/* 品牌图标来自各搜索源官网，已下载到本地，避免运行时热链 */}
                    <img
                      src={provider.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        id={`provider-${provider.id}`}
                        checked={active}
                        aria-label={`启用 ${provider.name}`}
                        onCheckedChange={(checked) =>
                          onValueChange(
                            checked
                              ? [...value, provider.id]
                              : value.filter((id) => id !== provider.id)
                          )
                        }
                      />
                      <Label
                        htmlFor={`provider-${provider.id}`}
                        className="cursor-pointer text-[15px] font-medium"
                      >
                        {provider.name}
                      </Label>
                      <InfoTip label={`${provider.name}说明`}>
                        {provider.hint}
                      </InfoTip>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <CardStatus
                      label={statusText(provider, state)}
                      active={Boolean(state?.configured)}
                    />
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`${provider.name} 官方文档`}
                      className="hidden items-center gap-1 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline-flex"
                    >
                      文档
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        className="size-3"
                        strokeWidth={2}
                      />
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <SecretField
                      id={`provider-key-${provider.id}`}
                      name={`providerKey_${provider.id}`}
                      ariaLabel={`${provider.name} API Key`}
                      placeholder={keyPlaceholder(state, provider)}
                      preview={state?.keyPreview ?? null}
                      resetToken={resetToken}
                      className="min-w-0 flex-1"
                      onReveal={async () => {
                        const result = await revealProviderKeyAction(provider.id)
                        return result.ok ? result.apiKey ?? null : null
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      disabled={testing === provider.id}
                      onClick={(event) =>
                        runTest(provider.id, event.currentTarget)
                      }
                    >
                      {testing === provider.id ? (
                        <Spinner className="size-3" />
                      ) : null}
                      {testing === provider.id ? "测试中" : "测试连接"}
                    </Button>
                  </div>

                  {result ? (
                    <p
                      className={cn(
                        "flex items-start gap-1.5 text-[11px] leading-relaxed",
                        result.ok
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                      aria-live="polite"
                    >
                      <HugeiconsIcon
                        icon={
                          result.ok ? CheckmarkCircle02Icon : AlertCircleIcon
                        }
                        className="mt-0.5 size-3 shrink-0"
                        strokeWidth={2}
                      />
                      {result.message}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

    </div>
  )
}
