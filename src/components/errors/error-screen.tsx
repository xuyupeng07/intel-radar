"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ErrorAction = {
  label: string
  href?: string
  behavior?: "back" | "reload"
  variant?: "default" | "outline"
}

type ErrorScreenProps = {
  code: string
  title: string
  description: string
  actions?: ErrorAction[]
  /** 脱离应用壳层时（例如根级 not-found）占满整个视口。 */
  standalone?: boolean
  className?: string
}

/** 简约的异常状态页：超大状态码 + 一句说明 + 少量操作。 */
export function ErrorScreen({
  code,
  title,
  description,
  actions = [],
  standalone = false,
  className,
}: ErrorScreenProps) {
  const router = useRouter()

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        standalone && "min-h-svh",
        className
      )}
    >
      <h1 className="text-[5.5rem] leading-none font-bold tracking-tight tabular-nums select-none sm:text-[7rem]">
        {code}
      </h1>
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const variant = action.variant ?? "default"

            if (action.href) {
              return (
                <Button
                  key={action.label}
                  variant={variant}
                  nativeButton={false}
                  render={<Link href={action.href} />}
                >
                  {action.label}
                </Button>
              )
            }

            return (
              <Button
                key={action.label}
                variant={variant}
                onClick={() => {
                  if (action.behavior === "reload") {
                    window.location.reload()
                    return
                  }
                  router.back()
                }}
              >
                {action.label}
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
