"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Analytics01Icon,
  ComputerIcon,
  Moon02Icon,
  News01Icon,
  PlayCircleIcon,
  Settings01Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { NAV_GROUPS, NAV_ITEMS, NAV_SEARCH_ITEMS } from "@/lib/nav"
import { NavIcon } from "@/components/nav-icon"

type CommandMenuContextValue = {
  open: () => void
}

const CommandMenuContext = React.createContext<CommandMenuContextValue | null>(null)

export function useCommandMenu() {
  const context = React.useContext(CommandMenuContext)
  if (!context) throw new Error("useCommandMenu must be used inside CommandMenuProvider")
  return context
}

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const go = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  return (
    <CommandMenuContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="搜索页面、设置或操作…" />
        <CommandList>
          <CommandEmpty>没有找到匹配的内容。</CommandEmpty>
          {NAV_GROUPS.map((group) => {
            const items = NAV_SEARCH_ITEMS.filter((item) => item.group === group.label)
            return (
              <CommandGroup key={group.label} heading={group.label}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.group}-${item.href}`}
                    value={`${item.title} ${item.parent ?? ""} ${item.description ?? ""}`}
                    onSelect={() => go(item.href)}
                  >
                    <NavIcon item={item} className="size-4" strokeWidth={2} />
                    <span>{item.title}</span>
                    {item.parent ? (
                      <span className="text-[11px] text-muted-foreground">{item.parent}</span>
                    ) : null}
                    <CommandShortcut>{item.href}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
          <CommandSeparator />
          <CommandGroup heading="快捷操作">
            <CommandItem value="采集设置 检索词 模型" onSelect={() => go("/settings")}>
              <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
              采集设置
            </CommandItem>
            <CommandItem value="今日日报 情报" onSelect={() => go("/briefs")}>
              <HugeiconsIcon icon={News01Icon} className="size-4" strokeWidth={2} />
              查看今日日报
            </CommandItem>
            <CommandItem value="运营看板 采集 统计" onSelect={() => go("/admin")}>
              <HugeiconsIcon icon={Analytics01Icon} className="size-4" strokeWidth={2} />
              运营看板
            </CommandItem>
            <CommandItem value="运行记录 任务" onSelect={() => go("/runs")}>
              <HugeiconsIcon icon={PlayCircleIcon} className="size-4" strokeWidth={2} />
              查看运行记录
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="外观">
            <CommandItem value="浅色模式" onSelect={() => { setTheme("light"); setOpen(false) }}>
              <HugeiconsIcon icon={Sun03Icon} className="size-4" strokeWidth={2} />
              浅色模式
            </CommandItem>
            <CommandItem value="深色模式" onSelect={() => { setTheme("dark"); setOpen(false) }}>
              <HugeiconsIcon icon={Moon02Icon} className="size-4" strokeWidth={2} />
              深色模式
            </CommandItem>
            <CommandItem value="跟随系统" onSelect={() => { setTheme("system"); setOpen(false) }}>
              <HugeiconsIcon icon={ComputerIcon} className="size-4" strokeWidth={2} />
              跟随系统
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandMenuContext.Provider>
  )
}

export function CommandMenuTrigger({ className }: { className?: string }) {
  const { open } = useCommandMenu()
  return (
    <button
      type="button"
      onClick={open}
      className={className}
      aria-label="打开命令面板"
    />
  )
}

export { NAV_ITEMS }
