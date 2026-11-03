"use client"

import * as React from "react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * 统一的「密钥输入框」：默认显示前后各 4 位的掩码，点眼睛才向服务端取完整值。
 *
 * 约定：
 * - 传了 `preview`（已保存密钥的掩码）时，输入框里就是这个掩码；眼睛负责换成完整值再换回来。
 * - 没传 `preview` 时按普通密码框处理，眼睛只切换本地输入内容的显隐。
 * - 用户清空输入框 = 不修改已保存的值（与保存逻辑一致）。
 */
export function SecretField({
  id,
  name,
  ariaLabel,
  placeholder,
  preview,
  onReveal,
  resetToken,
  className,
}: {
  id: string
  name: string
  ariaLabel: string
  placeholder: string
  /** 已保存密钥的掩码；没有已保存值时传 null。 */
  preview: string | null
  /** 点眼睛时拉完整值；返回 null 表示没有可拉取的已保存值。 */
  onReveal?: () => Promise<string | null>
  /** 保存成功后传新的 token，让输入框回落到掩码状态。 */
  resetToken?: string
  className?: string
}) {
  const masked = preview ?? ""
  const [value, setValue] = React.useState(masked)
  const [revealed, setRevealed] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 保存成功后回到「掩码」状态，避免把完整密钥留在输入框里。
  React.useEffect(() => {
    setValue(preview ?? "")
    setRevealed(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, preview])

  async function toggle() {
    if (loading) return

    // 没有已保存的密钥：只切换本地内容的显隐。
    if (!masked) {
      setRevealed((current) => !current)
      return
    }

    // 已经显示完整值：换回掩码。
    if (revealed) {
      setValue(masked)
      setRevealed(false)
      return
    }

    // 用户已经改了内容（不再是掩码）：只切换显隐，不必请求服务端。
    if (value !== masked) {
      setRevealed(true)
      return
    }

    if (!onReveal) {
      setRevealed(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const full = await onReveal()
      if (!full) {
        setError("读取完整密钥失败")
        return
      }
      setValue(full)
      setRevealed(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取完整密钥失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <InputGroup className="h-9">
        <InputGroupInput
          id={id}
          name={name}
          type={revealed || masked ? "text" : "password"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setRevealed(true)
            setError(null)
          }}
          onFocus={(event) => {
            // 掩码状态下聚焦即全选，直接输入就会覆盖，不用先删。
            if (value === masked) event.currentTarget.select()
          }}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={error ? `${id}-error` : undefined}
          className="font-mono text-xs"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={`${revealed ? "隐藏" : "查看"}${ariaLabel}`}
            title={revealed ? "隐藏完整密钥" : "查看完整密钥"}
            disabled={loading}
            onClick={toggle}
          >
            {loading ? (
              <Spinner className="size-3" />
            ) : (
              <HugeiconsIcon
                icon={revealed ? ViewOffIcon : ViewIcon}
                className="size-3.5"
                strokeWidth={2}
              />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {error ? (
        <p
          id={`${id}-error`}
          className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-400"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
