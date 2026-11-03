"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** 新闻源图标：先渲染首字，图标解码成功后再盖上去；失败也不会出现破图或空框。 */
export function SourceFavicon({
  site,
  icon,
  className,
}: {
  site: string
  icon?: string
  className?: string
}) {
  const [status, setStatus] = React.useState<"idle" | "ok" | "fail">("idle")
  const base = cn(
    "relative flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-muted ring-1 ring-border/60",
    className
  )

  return (
    <span className={base}>
      {status !== "ok" ? (
        <span
          aria-hidden
          className="text-[8px] leading-none font-semibold text-muted-foreground"
        >
          {site.slice(0, 1)}
        </span>
      ) : null}
      {icon && status !== "fail" ? (
        <img
          src={icon}
          alt=""
          width={14}
          height={14}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("fail")}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity",
            status === "ok" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </span>
  )
}
