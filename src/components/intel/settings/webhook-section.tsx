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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  WEBHOOK_PROVIDERS,
  type WebhookEndpointState,
  type WebhookProviderId,
} from "@/lib/webhooks"
import {
  resendBriefAction,
  revealWebhookSecretAction,
  testWebhookAction,
} from "@/lib/server/actions/settings"
import { cn } from "@/lib/utils"

type Feedback = { ok: boolean; message: string }

function statusText(state: WebhookEndpointState): string {
  if (!state.url) return "未配置"
  return state.enabled ? "已开启" : "已保存"
}

export function WebhookSection({
  states,
  resetToken,
}: {
  states: WebhookEndpointState[]
  resetToken: string
}) {
  const [enabled, setEnabled] = React.useState<WebhookProviderId[]>(() =>
    states.filter((item) => item.enabled).map((item) => item.provider)
  )
  const [testing, setTesting] = React.useState<WebhookProviderId | null>(null)
  const [resending, setResending] = React.useState(false)
  const [resendNote, setResendNote] = React.useState<Feedback | null>(null)
  const [feedback, setFeedback] = React.useState<
    Partial<Record<WebhookProviderId, Feedback>>
  >({})

  const activeCount = enabled.length

  async function resendBrief() {
    setResending(true)
    setResendNote(null)
    try {
      const result = await resendBriefAction()
      setResendNote({ ok: result.ok, message: result.message })
    } catch (error) {
      setResendNote({
        ok: false,
        message: `推送失败：${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setResending(false)
    }
  }

  async function runTest(
    provider: WebhookProviderId,
    trigger: HTMLButtonElement
  ) {
    // 用输入框里的当前值测试，不要求先保存；密钥留空时服务端会沿用已保存的。
    const form = trigger.closest("form")
    const read = (name: string) =>
      (form?.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)
        ?.value ?? ""

    setTesting(provider)
    try {
      const result = await testWebhookAction({
        provider,
        url: read(`webhookUrl_${provider}`),
        secret: read(`webhookSecret_${provider}`),
      })
      setFeedback((current) => ({ ...current, [provider]: result }))
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [provider]: {
          ok: false,
          message: `发送失败：${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">消息推送</h2>
          <InfoTip label="消息推送说明">
            采集成功并生成日报后，把当天日报摘要推到群里。三个平台可以同时开，
            推送失败只记日志，不影响已落库的情报与日报。
          </InfoTip>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          已开启 {activeCount} 个
        </span>
      </div>

      {enabled.map((provider) => (
        <input
          key={provider}
          type="hidden"
          name={`webhookEnabled_${provider}`}
          value="on"
        />
      ))}

      <div className="grid gap-3 xl:grid-cols-2">
        {WEBHOOK_PROVIDERS.map((meta) => {
          const state =
            states.find((item) => item.provider === meta.id) ??
            ({
              provider: meta.id,
              url: "",
              enabled: false,
              secretConfigured: false,
              secretPreview: null,
              updatedAt: null,
            } satisfies WebhookEndpointState)
          const active = enabled.includes(meta.id)
          const result = feedback[meta.id]

          return (
            <Card
              key={`${meta.id}-${resetToken}`}
              className={cn(
                "gap-0 py-0 transition-[box-shadow,border-color] duration-200",
                active && "ring-2 ring-primary/35!"
              )}
            >
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 ring-1 ring-black/5 dark:ring-white/15">
                    {/* 品牌图标来自各平台官网，已下载到本地，避免运行时热链 */}
                    <img
                      src={meta.icon}
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
                        id={`webhook-${meta.id}`}
                        checked={active}
                        aria-label={`启用 ${meta.name} 推送`}
                        onCheckedChange={(checked) =>
                          setEnabled((current) =>
                            checked
                              ? Array.from(new Set([...current, meta.id]))
                              : current.filter((item) => item !== meta.id)
                          )
                        }
                      />
                      <Label
                        htmlFor={`webhook-${meta.id}`}
                        className="cursor-pointer text-[15px] font-medium"
                      >
                        {meta.name}
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        {meta.brand}
                      </span>
                      <InfoTip label={`${meta.name}推送说明`}>
                        {meta.urlHint}
                      </InfoTip>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      群机器人 Webhook，采集完成后推送当天日报摘要
                    </p>
                  </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <CardStatus
                      label={statusText(state)}
                      active={Boolean(state.url && state.enabled)}
                    />
                    <a
                      href={meta.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`${meta.name} 机器人文档`}
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
                    <Input
                      name={`webhookUrl_${meta.id}`}
                      defaultValue={state.url}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={meta.urlPlaceholder}
                      aria-label={`${meta.name} Webhook 地址`}
                      className="h-9 min-w-0 flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      disabled={testing === meta.id}
                      onClick={(event) => runTest(meta.id, event.currentTarget)}
                    >
                      {testing === meta.id ? (
                        <Spinner className="size-3" />
                      ) : null}
                      {testing === meta.id ? "发送中" : "测试发送"}
                    </Button>
                  </div>

                  {meta.signed ? (
                    <SecretField
                      id={`webhook-secret-${meta.id}`}
                      name={`webhookSecret_${meta.id}`}
                      ariaLabel={`${meta.name} ${meta.secretLabel}`}
                      placeholder={
                        state.secretPreview
                          ? "已保存，留空表示不修改"
                          : `${meta.secretLabel}（可选，开启加签才需要）`
                      }
                      preview={state.secretPreview}
                      resetToken={resetToken}
                      onReveal={async () => {
                        const result = await revealWebhookSecretAction(meta.id)
                        return result.ok ? result.secret ?? null : null
                      }}
                    />
                  ) : null}

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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-[11px] leading-relaxed text-muted-foreground">
          「测试发送」直接用输入框里的地址与密钥，可以先测再保存；密钥留空表示沿用已保存的值。
          推送内容是当天日报正文 + 末尾的相关新闻（标题、链接、发布日期）。
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {resendNote ? (
            <span
              className={cn(
                "max-w-[240px] text-[11px] leading-relaxed",
                resendNote.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
              aria-live="polite"
            >
              {resendNote.message}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={resending}
            onClick={resendBrief}
          >
            {resending ? <Spinner className="size-3" /> : null}
            {resending ? "推送中" : "重推今日日报"}
          </Button>
        </div>
      </div>
    </div>
  )
}
