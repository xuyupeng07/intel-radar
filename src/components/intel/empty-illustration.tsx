/**
 * 情报域空状态插画。
 * 来源：unDraw（https://undraw.co/illustrations），可免费商用、无需署名；
 * 只作装饰，不承载业务信息。
 */
export type EmptyIllustrationVariant =
  | "question"
  | "no-data"
  | "empty"
  | "searching"

const ILLUSTRATIONS: Record<
  EmptyIllustrationVariant,
  { src: string; width: number; height: number; md: string; sm: string }
> = {
  question: {
    src: "/illustrations/undraw-question.svg",
    width: 180,
    height: 145,
    md: "h-32",
    sm: "h-20",
  },
  "no-data": {
    src: "/illustrations/undraw-no-data.svg",
    width: 180,
    height: 171,
    md: "h-32",
    sm: "h-20",
  },
  empty: {
    src: "/illustrations/undraw-empty.svg",
    width: 200,
    height: 156,
    md: "h-32",
    sm: "h-20",
  },
  searching: {
    src: "/illustrations/undraw-searching.svg",
    width: 220,
    height: 111,
    md: "h-28",
    sm: "h-16",
  },
}

export function EmptyIllustration({
  variant = "question",
  size = "md",
  className,
}: {
  variant?: EmptyIllustrationVariant
  size?: "sm" | "md"
  className?: string
}) {
  const illustration = ILLUSTRATIONS[variant]

  return (
    <div
      aria-hidden="true"
      className={`flex w-full select-none items-center justify-center ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={illustration.src}
        alt=""
        width={illustration.width}
        height={illustration.height}
        decoding="async"
        className={`${size === "sm" ? illustration.sm : illustration.md} w-auto opacity-90 dark:opacity-80`}
      />
    </div>
  )
}
