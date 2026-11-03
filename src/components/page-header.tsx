import * as React from "react"

import { cn } from "@/lib/utils"

export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 md:py-6",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Intelligence desk</p>
        <h1 className="text-display text-[clamp(2.2rem,4.2vw,3.9rem)] leading-[0.95] text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  )
}
