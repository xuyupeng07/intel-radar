"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Alert02Icon, Delete02Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useWorkspace } from "@/components/workspace-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  deleteWorkspaceAction,
  workspaceAdminListAction,
  type WorkspaceUsageMap,
} from "@/lib/server/actions/workspaces"
import { cn } from "@/lib/utils"
import { hydrateWorkspace, type Workspace } from "@/lib/workspaces"

/**
 * 管理工作空间：列出全部工作区与数据量，可逐个删除。
 * 删除是物理删除（情报 / 日报 / 运行记录 / 设置 / 密钥 / 群机器人一起清掉），
 * 所以走二次确认；最后一个工作区不允许删。
 */
export function WorkspaceManageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { workspace: current } = useWorkspace()
  const [list, setList] = React.useState<Workspace[]>([])
  const [usage, setUsage] = React.useState<WorkspaceUsageMap>({})
  const [pending, setPending] = React.useState<Workspace | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, startDelete] = React.useTransition()
  const [usageTick, setUsageTick] = React.useState(0)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    void workspaceAdminListAction()
      .then((data) => {
        if (cancelled) return
        setList(data.workspaces.map(hydrateWorkspace))
        setUsage(data.usage)
      })
      .catch(() => {
        if (!cancelled) setList([])
      })
    return () => {
      cancelled = true
    }
  }, [open, usageTick])

  function confirmDelete() {
    if (!pending) return
    const target = pending
    startDelete(async () => {
      const result = await deleteWorkspaceAction(target.id)
      if (!result.ok) {
        setError(result.error)
        setPending(null)
        return
      }
      setPending(null)
      setError(null)
      setUsageTick((value) => value + 1)
      router.refresh()
    })
  }

  const onlyOne = list.length <= 1

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-display text-2xl tracking-tight">
              管理工作空间
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              每个工作空间的数据完全独立。删除会连同情报、日报、运行记录、设置与密钥一起清除，
              无法恢复。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            {list.map((item) => {
              const stat = usage[item.id]
              const isCurrent = item.id === current.id
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3",
                    isCurrent
                      ? "border-primary/40 bg-primary/8"
                      : "border-border/60 bg-card/40"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/90 text-background">
                    <HugeiconsIcon icon={item.icon} className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          当前
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.industry}
                      {stat
                        ? ` · ${stat.items} 条情报 · ${stat.briefs} 份日报 · ${stat.runs} 次运行`
                        : " · 统计中…"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                    disabled={onlyOne || deleting}
                    onClick={() => {
                      setError(null)
                      setPending(item)
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={2} />
                    删除
                  </Button>
                </div>
              )
            })}
          </div>

          {onlyOne ? (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
              至少保留一个工作空间，最后一个不能删除。
            </p>
          ) : null}

          {error ? (
            <p aria-live="polite" className="text-[11px] text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(next) => {
          if (!next && !deleting) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{pending?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && usage[pending.id]
                ? `将删除 ${usage[pending.id].items} 条情报、${usage[pending.id].briefs} 份日报、${usage[pending.id].runs} 次运行记录，以及它的设置、搜索源 Key 与群机器人配置。`
                : "将删除该工作空间下的全部数据。"}
              此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-600/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
            >
              {deleting ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                  strokeWidth={2}
                />
              ) : null}
              {deleting ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
