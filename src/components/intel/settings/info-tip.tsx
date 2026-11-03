"use client"

import * as React from "react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** 设置页的说明统一收进 tooltip，避免表单被长段描述撑散。 */
export function InfoTip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setOpen((value) => !value)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                setOpen((value) => !value)
              }
            }}
            onBlur={() => setOpen(false)}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="size-3.5"
              strokeWidth={1.8}
            />
          </button>
        }
      />
      <TooltipContent
        side={side}
        className={className ? className : "max-w-[280px] leading-relaxed"}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
