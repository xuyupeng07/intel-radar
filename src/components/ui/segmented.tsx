"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * 分段切换（无面板）。用于「切条件 / 切视图」，不用于切内容。
 *
 * 与 ui/tabs.tsx 的区别：
 * - 没有 tabpanel，因此语义用 role="group" + aria-pressed，而不是 role="tab"
 *   —— 没有面板却声称是 tab，属于 ARIA 规范违反
 * - 选中态是一层独立胶囊，靠实测坐标滑动
 *
 * 为什么自建：Base UI 的 Tabs.List 不透传 ref，装不进指示器（见 90-pitfalls）。
 */

type SegmentedContextValue = {
  value: string
  setValue: (next: string) => void
}

const SegmentedContext = React.createContext<SegmentedContextValue>({
  value: "",
  setValue: () => {},
})

function Segmented({
  value,
  defaultValue = "",
  onValueChange,
  className,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (next: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInner(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )

  return (
    <SegmentedContext.Provider value={{ value: current, setValue }}>
      <div className={cn("min-w-0", className)}>{children}</div>
    </SegmentedContext.Provider>
  )
}

function SegmentedList({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const ctx = React.useContext(SegmentedContext)
  const ref = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState<{ x: number; w: number } | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      if (!active) {
        setBox(null)
        return
      }
      setBox({ x: active.offsetLeft - list.scrollLeft, w: active.offsetWidth })
    }
    measure()
    const frame = window.requestAnimationFrame(() => {
      measure()
      setReady(true)
    })
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    list.querySelectorAll<HTMLButtonElement>("button").forEach((el) => observer.observe(el))
    const mutation = new MutationObserver(measure)
    mutation.observe(list, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] })
    // 没有选中项时，保证第一个可用按钮能被 Tab 到
    if (!list.querySelector('button[aria-pressed="true"]')) {
      const first = list.querySelector<HTMLButtonElement>("button:not(:disabled)")
      if (first) first.tabIndex = 0
    }

    list.addEventListener("scroll", measure, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      mutation.disconnect()
      list.removeEventListener("scroll", measure)
    }
  }, [])

  return (
    <div
      ref={ref}
      role="group"
      onKeyDown={(event) => handleGroupKeyDown(event, ctx.setValue)}
      className={cn(
        "relative inline-flex h-8 w-fit max-w-full items-center justify-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {box ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 left-0 z-0 rounded-md bg-background shadow-sm",
            ready && "transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
          )}
          style={{ transform: `translateX(${box.x}px)`, width: box.w }}
        />
      ) : null}
      {children}
    </div>
  )
}

/**
 * 方向键在选项间移动并立即选中（WAI-ARIA tablist 的既有习惯），
 * Home / End 跳到首尾。按钮本身只留一个 tabIndex=0（roving tabindex），
 * 所以 Tab 键是"进入/离开整组"，组内移动交给方向键。
 */
function handleGroupKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  setValue: (next: string) => void
) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]
  if (!keys.includes(event.key)) return

  const list = event.currentTarget
  const buttons = Array.from(
    list.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
  )
  if (buttons.length === 0) return

  const current = buttons.findIndex((button) => button === document.activeElement)
  let next = current

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = current < 0 ? 0 : (current + 1) % buttons.length
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = current <= 0 ? buttons.length - 1 : current - 1
  } else if (event.key === "Home") {
    next = 0
  } else if (event.key === "End") {
    next = buttons.length - 1
  }

  event.preventDefault()
  const target = buttons[next]
  target.focus()
  const value = target.dataset.value
  if (value) setValue(value)
}

function SegmentedItem({
  value,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const ctx = React.useContext(SegmentedContext)
  const active = ctx.value === value

  return (
    <button
      type="button"
      data-value={value}
      aria-pressed={active}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "relative z-10 inline-flex h-full shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Segmented, SegmentedList, SegmentedItem }
