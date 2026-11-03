import type { ComponentProps, ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { TONE_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"

type IconProp = ComponentProps<typeof HugeiconsIcon>["icon"]

/**
 * 状态 → 语义色调。全站只在这里登记一次；
 * 新状态先看能不能复用已有语义（成功 / 进行中 / 待办 / 失败 / 中性），不要新建颜色。
 */
const STATUS_TONE: Record<string, Tone> = {
  已支付: "success",
  已发布: "success",
  在售: "success",
  成功: "success",
  正常: "success",
  启用: "success",
  活跃: "success",
  在职: "success",
  已结课: "success",
  教师: "success",
  处理中: "info",
  运行中: "info",
  跟进中: "info",
  兼职: "info",
  进行中: "info",
  运营: "info",
  待付款: "warning",
  待审核: "warning",
  缺货: "warning",
  波动: "warning",
  待跟进: "warning",
  休假: "warning",
  已下线: "danger",
  失败: "danger",
  已退款: "neutral",
  草稿: "neutral",
  停售: "neutral",
  已暂停: "neutral",
  已流失: "neutral",
  未开始: "neutral",
  只读: "neutral",
  灰度: "accent",
  管理员: "accent",
}

const QUIET_VARIANT = {
  success: "secondary",
  info: "outline",
  warning: "outline",
  danger: "ghost",
  neutral: "ghost",
  accent: "outline",
} as const

export type StatusBadgeProps = {
  /** 中文状态词：命中 STATUS_TONE 时自动取色调，未命中按中性处理 */
  status?: string
  /** 显式语义色调，优先于 status */
  tone?: Tone
  /** tone = 语义色块（默认）；outline / secondary / ghost = 安静模式，只靠徽标样式与图标区分 */
  variant?: "tone" | "outline" | "secondary" | "ghost"
  icon?: IconProp
  /** 在线 / 运行中这类「活」状态：前置一个呼吸圆点 */
  pulse?: boolean
  className?: string
  children?: ReactNode
}

/** 呼吸圆点：状态徽标与「实时」标记共用，不要在各页手写 animate-ping。 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-1.5 shrink-0", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
    </span>
  )
}

export function StatusBadge({
  status,
  tone,
  variant = "tone",
  icon,
  pulse,
  className,
  children,
}: StatusBadgeProps) {
  const resolved: Tone = tone ?? (status ? (STATUS_TONE[status] ?? "neutral") : "neutral")
  const label = children ?? status

  return (
    <Badge
      variant={variant === "tone" ? "outline" : QUIET_VARIANT[resolved]}
      className={cn(
        "h-5 shrink-0 gap-1 rounded-full px-2 text-[11px] font-medium",
        variant === "tone" && TONE_CLASS[resolved],
        variant !== "tone" && "font-normal",
        className
      )}
    >
      {pulse ? <LiveDot /> : null}
      {icon ? <HugeiconsIcon icon={icon} className="size-3" strokeWidth={2} /> : null}
      {label}
    </Badge>
  )
}
