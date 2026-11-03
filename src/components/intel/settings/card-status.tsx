import { TONE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"

/**
 * 卡片右上角的状态胶囊：已开启 / 已保存 / 未配置。
 * 有边框的小胶囊，避免和卡片正文里的说明文字混在一起。
 */
export function CardStatus({
  label,
  active,
}: {
  label: string
  /** 真正生效（已开启 / 已配置）时为 true，用信号色。 */
  active: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] leading-none",
        active ? TONE_CLASS.success : TONE_CLASS.neutral
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/45"
        )}
      />
      {label}
    </span>
  )
}
