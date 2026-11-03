"use client"

import { Segmented, SegmentedItem, SegmentedList } from "@/components/ui/segmented"

export type SegmentedOption = {
  value: string
  label: React.ReactNode
  ariaLabel?: string
  /** 计数为 0 时置灰且不可点，避免点进一个必然空列表 */
  disabled?: boolean
}

/**
 * 分段控件的 **options 语法糖**。
 *
 * 实现只有一份：`components/ui/segmented.tsx`（滑动胶囊 + role=group）。
 * 这里不重复测量与动画，只把「选项数组」翻译成 JSX。
 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
}: {
  options: SegmentedOption[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}) {
  return (
    <Segmented value={value} onValueChange={onValueChange} className={className}>
      <SegmentedList>
        {options.map((option) => (
          <SegmentedItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={option.ariaLabel}
          >
            {option.label}
          </SegmentedItem>
        ))}
      </SegmentedList>
    </Segmented>
  )
}
