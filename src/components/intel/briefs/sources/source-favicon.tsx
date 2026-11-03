"use client"

import * as React from "react"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

const TONES = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-violet-600",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-indigo-500",
  "bg-teal-600",
]

function toneFor(host: string) {
  let hash = 0
  for (let index = 0; index < host.length; index += 1) {
    hash = (hash * 31 + host.charCodeAt(index)) | 0
  }
  return TONES[Math.abs(hash) % TONES.length]
}

export function SourceFavicon({
  url,
  siteName,
  iconUrl,
  className,
}: {
  url: string
  siteName?: string | null
  iconUrl?: string | null
  className?: string
}) {
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const host = safeHost(url)
  const label = (siteName?.trim() || host).charAt(0).toUpperCase()
  const showFallback = !iconUrl || failed

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] text-[9px] font-semibold text-white ring-1 ring-black/5",
        showFallback ? toneFor(host) : "bg-muted",
        className
      )}
    >
      {showFallback ? (
        label ? (
          <span className="flex size-full items-center justify-center">
            {label}
          </span>
        ) : (
          <HugeiconsIcon icon={Globe02Icon} className="size-3" />
        )
      ) : null}

      {!failed && iconUrl ? (
        // 优先使用搜索接口返回的 site_icon。加载中保持中性底色，
        // 只有真正失败或没有 icon 时才显示首字母，避免把字母误认成站点图标。
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          className={cn(
            "absolute inset-0 size-full bg-white object-contain p-px transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0"
          )}
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  )
}
