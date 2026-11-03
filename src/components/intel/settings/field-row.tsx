import * as React from "react"

import { InfoTip } from "@/components/intel/settings/info-tip"
import { Label } from "@/components/ui/label"

/** 设置页统一的行布局：左侧标签与说明，右侧控件。 */
export function FieldRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:gap-6">
      <div className="flex items-center gap-1.5 pt-1.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        <InfoTip label={`${label}说明`}>{hint}</InfoTip>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
