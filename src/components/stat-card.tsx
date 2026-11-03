import * as React from "react"
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent } from "@/components/ui/card"

type IconProp = React.ComponentProps<typeof HugeiconsIcon>["icon"]
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  delta,
  hint = "较上月",
  icon: Icon,
  spark,
}: {
  label: string
  value: string
  delta: number
  hint?: string
  icon: IconProp
  spark?: number[]
}) {
  const up = delta >= 0
  const max = spark ? Math.max(...spark) : 1

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="flex flex-col gap-2 p-4 sm:gap-3 sm:p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <span className="hidden size-8 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
            <HugeiconsIcon icon={Icon} className="size-4" strokeWidth={2} />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</p>
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                  up
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                <HugeiconsIcon
                  icon={up ? ArrowUpRight01Icon : ArrowDownRight01Icon}
                  className="size-3"
                  strokeWidth={2.5}
                />
                {Math.abs(delta)}%
              </span>
              <span className="hidden text-muted-foreground min-[360px]:inline">{hint}</span>
            </div>
          </div>

          {spark ? (
            <div className="hidden h-10 w-20 items-end gap-[3px] sm:flex" aria-hidden>
              {spark.map((point, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex-1 rounded-sm",
                    up ? "bg-primary/25" : "bg-rose-500/25"
                  )}
                  style={{ height: `${Math.max(12, (point / max) * 100)}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
