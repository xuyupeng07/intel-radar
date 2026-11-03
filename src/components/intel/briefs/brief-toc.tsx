"use client"

import * as React from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export type BriefTocItem = {
  id: string
  label: string
}

/**
 * 日报目录大纲：点击平滑定位，滚动时高亮当前章节。
 * 桌面固定在右侧栏，移动端收成可展开的 <details>。
 */
export function BriefToc({
  items,
  variant = "rail",
}: {
  items: BriefTocItem[]
  variant?: "rail" | "mobile"
}) {
  const [active, setActive] = React.useState(items[0]?.id ?? "")
  const detailsRef = React.useRef<HTMLDetailsElement>(null)

  React.useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]")
    const ids = items.map((item) => item.id)

    const update = () => {
      const top = (scroller?.getBoundingClientRect().top ?? 0) + 112
      let current = ids[0] ?? ""
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= top) current = id
      }
      if (
        scroller &&
        scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 8
      ) {
        current = ids[ids.length - 1] ?? current
      }
      setActive(current)
    }

    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (ids.includes(id)) {
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ block: "start" })
        })
      }
    }

    update()
    const target: HTMLElement | Window = scroller ?? window
    target.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      target.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [items])

  const scrollTo = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    window.history.replaceState(null, "", `#${id}`)
    setActive(id)
    if (detailsRef.current) detailsRef.current.open = false
  }

  const list = (
    <nav aria-label="目录大纲" className="flex flex-col">
      {items.map((item) => {
        const isActive = item.id === active
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            onClick={(event) => scrollTo(event, item.id)}
            className={cn(
              "border-l-2 py-1.5 pl-3 text-xs leading-snug transition-colors",
              isActive
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )

  if (variant === "mobile") {
    return (
      <details
        ref={detailsRef}
        className="group rounded-lg border bg-card/50 xl:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            目录大纲
            <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
              {items.length} 节
            </span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180"
            strokeWidth={2}
          />
        </summary>
        <div className="border-t px-3 py-2">{list}</div>
      </details>
    )
  }

  return (
    <div className="hidden flex-col xl:flex">
      <div className="flex items-baseline justify-between border-b pb-2">
        <h2 className="text-xs font-medium text-foreground">目录大纲</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {items.length} 节
        </span>
      </div>
      <div className="mt-1">{list}</div>
    </div>
  )
}
