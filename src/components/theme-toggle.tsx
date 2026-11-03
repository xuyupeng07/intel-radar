"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export const THEME_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun03Icon },
  { value: "dark", label: "深色", icon: Moon02Icon },
  { value: "system", label: "跟随系统", icon: ComputerIcon },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="切换主题"
            className={cn("text-muted-foreground hover:text-foreground max-lg:size-10", className)}
          />
        }
      >
        <HugeiconsIcon icon={Sun03Icon} className="size-4 dark:hidden" strokeWidth={2} />
        <HugeiconsIcon
          icon={Moon02Icon}
          className="hidden size-4 dark:block"
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-1.5">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="rounded-xl"
            onClick={() => setTheme(option.value)}
          >
            <HugeiconsIcon icon={option.icon} className="size-4" strokeWidth={2} />
            {option.label}
            {theme === option.value ? (
              <HugeiconsIcon icon={Tick02Icon} className="ml-auto size-4" strokeWidth={2} />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
