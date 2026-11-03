import Link from "next/link"

import { RadarMark } from "@/components/brand/radar-mark"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * 认证页外壳：居中的品牌标识 + 单列表单，背景只有一层极淡的主色光晕与网格。
 * 与站内 AppShell 完全分离，登录页不继承侧边栏。
 */
export function AuthShell({
  children,
  footer = "© 2026 Radar · 内部使用",
}: {
  children: React.ReactNode
  footer?: string
}) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-12%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent_75%)]"
      />

      <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="eyebrow">Intelligence Desk</span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-2 pb-16 sm:pb-20">
        <div className="mb-8 flex flex-col items-center gap-3">
        <Link
          href="/login"
          aria-label="行业情报雷达"
          className="inline-flex items-center gap-2.5"
        >
          <span className="flex size-9 items-center justify-center rounded-full text-primary drop-shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
            <RadarMark className="size-8" />
          </span>
          <span className="text-display text-[1.75rem] leading-none tracking-tight">
            Radar<span className="text-primary">.</span>
          </span>
        </Link>
          <span className="eyebrow text-[9px]">Industry Intelligence</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          {footer}
        </p>
      </main>
    </div>
  )
}
