"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  Loading03Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction, type LoginState } from "@/lib/server/actions/auth"
import { cn } from "@/lib/utils"

const INITIAL_STATE: LoginState = {}

/** 单列登录卡：口令 + 可见性切换 + 全宽主按钮，错误贴字段。 */
export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = React.useActionState(
    loginAction,
    INITIAL_STATE
  )
  const [visible, setVisible] = React.useState(false)
  const errorId = "login-password-error"

  return (
    <Card className="gap-6 rounded-[1.75rem] border-border/60 bg-card/70 py-7 shadow-[0_40px_90px_-50px_oklch(0.2_0.05_255/0.9)] backdrop-blur-md">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-display text-[2rem] leading-none tracking-tight">
          登录
        </CardTitle>
        <CardDescription className="text-[13px] leading-relaxed">
          输入访问口令，继续查看今日情报与日报。
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="grid gap-4" noValidate>
          <input type="hidden" name="next" value={next} />

          <div className="grid gap-1.5">
            <Label htmlFor="access-password" className="text-xs font-medium">
              访问口令
            </Label>
            <div className="relative">
              <Input
                id="access-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                placeholder="请输入访问口令"
                aria-invalid={Boolean(state.error)}
                aria-describedby={state.error ? errorId : undefined}
                className="h-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? "隐藏口令" : "显示口令"}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-2xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <HugeiconsIcon
                  icon={visible ? ViewOffIcon : ViewIcon}
                  className="size-4"
                  strokeWidth={1.8}
                />
              </button>
            </div>

            {state.error ? (
              <p
                id={errorId}
                aria-live="polite"
                className="flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-600 dark:text-rose-400"
              >
                {state.error}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className={cn("mt-1 h-10 w-full", pending && "opacity-90")}
            disabled={pending}
          >
            {pending ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
                strokeWidth={2}
              />
            ) : null}
            {pending ? "验证中…" : "登录"}
            {pending ? null : (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={2}
              />
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t-0 bg-transparent pt-0 text-center text-[11px] leading-relaxed text-muted-foreground">
        口令在部署环境里配置；忘记后可让管理员重置。
      </CardFooter>
    </Card>
  )
}
