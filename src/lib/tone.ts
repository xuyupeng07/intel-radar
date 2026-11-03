/**
 * 状态色调：全站唯一的一套「语义色 → 类名」映射。
 *
 * 只在这里写 `emerald / sky / amber / rose / violet` 的具体类名；
 * 业务代码用 `toneClass("success")` 或直接 `<StatusBadge tone="success">`，
 * 不要在自己文件里拼 `border-emerald-500/20 bg-emerald-500/10 …`。
 *
 * 软标签在深色下必须「一圈边 + 提亮文字」：
 * 浅色 500/20 + 500/10 + 700，深色 400/35 + 400/10 + 300。
 * 深色下只靠 500 档填充会变成脏底 + 中色字。
 */
export const TONE_CLASS = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-300",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-300",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-300",
  danger:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/35 dark:bg-rose-400/10 dark:text-rose-300",
  neutral: "border-border bg-muted text-muted-foreground",
  accent:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/35 dark:bg-violet-400/10 dark:text-violet-300",
} as const

/** 蓝色品牌 chip（最新一期、当前选中、版本号）：深色下不要用 primary 填充。 */
export const BRAND_CHIP =
  "border-signal/30 bg-signal/10 text-signal"

export type Tone = keyof typeof TONE_CLASS

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone]
}
