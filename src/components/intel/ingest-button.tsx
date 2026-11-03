"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Radar02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { triggerIngestAction } from "@/lib/server/actions/ingest"

type IngestButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "children" | "disabled"
> & {
  date?: string
  label?: string
}

/**
 * 采集按钮：Server Action 内执行完整管线，完成后刷新当前路由。
 * 采集中禁用，避免重复触发同一天。
 */
export function IngestButton({
  date,
  label = "立即采集",
  variant = "default",
  size = "sm",
  className,
  ...props
}: IngestButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function run() {
    startTransition(async () => {
      const result = await triggerIngestAction(date)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        `采集完成：${result.items} 条情报，日报「${result.briefTitle}」`
      )
      router.refresh()
    })
  }

  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={run}
    >
      {pending ? (
        <Spinner className="size-3.5" />
      ) : (
        <HugeiconsIcon icon={Radar02Icon} className="size-3.5" strokeWidth={2} />
      )}
      {pending ? "采集中…" : label}
    </Button>
  )
}
