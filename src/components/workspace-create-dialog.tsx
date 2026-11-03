"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Add01Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWorkspaceAction } from "@/lib/server/actions/workspaces"
import { INDUSTRY_SUGGESTIONS } from "@/lib/workspaces"
import { cn } from "@/lib/utils"

/**
 * 新建工作区：只填名称与领域。
 * 设置全部走默认值、不复制任何 Key，情报与日报天然按新 id 隔离。
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [industry, setIndustry] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function reset() {
    setName("")
    setIndustry("")
    setError(null)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    const trimmedIndustry = industry.trim()
    if (trimmed.length < 2) {
      setError("工作区名称至少 2 个字")
      return
    }
    if (trimmedIndustry.length < 2) {
      setError("请填写领域（至少 2 个字）")
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createWorkspaceAction({
        name: trimmed,
        industry: trimmedIndustry,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl tracking-tight">
              新建工作空间
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              新建的是独立领域：检索词、提示词都从通用模板开始，Key 全部为空，情报与日报与其他工作区互不可见。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="workspace-name" className="text-xs font-medium">
              名称
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError(null)
              }}
              placeholder="例如：新能源情报组"
              autoComplete="off"
              maxLength={24}
              autoFocus
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workspace-industry" className="text-xs font-medium">
              领域
            </Label>
            <Input
              id="workspace-industry"
              value={industry}
              onChange={(event) => {
                setIndustry(event.target.value)
                if (error) setError(null)
              }}
              placeholder="例如：新能源、医疗健康、半导体"
              autoComplete="off"
              maxLength={12}
            />
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_SUGGESTIONS.map((item) => {
                const active = industry.trim() === item
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setIndustry(item)
                      if (error) setError(null)
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      active
                        ? "border-primary/50 bg-primary/12 text-primary"
                        : "border-border/70 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              每个工作区是一个独立领域。创建后会按这个领域名生成一版通用检索词与提示词，
              搜索源 Key、情报、日报都不共享，需要你按自己的领域重新配置。
            </p>
          </div>

          {error ? (
            <p aria-live="polite" className="text-[11px] text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                  strokeWidth={2}
                />
              ) : (
                <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
              )}
              {pending ? "创建中…" : "创建工作空间"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
