import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"
import { AUTH_ENV_PASSWORD, configuredPassword, safeNextPath } from "@/lib/auth"

export const metadata: Metadata = { title: "登录" }
export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const configured = Boolean(configuredPassword())

  return (
    <AuthShell>
      {configured ? (
        <LoginForm next={safeNextPath(next)} />
      ) : (
        <div className="rounded-3xl border border-border/70 bg-card/60 px-5 py-6 text-center">
          <p className="text-sm font-medium">访问口令未配置</p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            请在部署环境里设置{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              {AUTH_ENV_PASSWORD}
            </code>
            ，保存后重启容器即可。
          </p>
        </div>
      )}
    </AuthShell>
  )
}
