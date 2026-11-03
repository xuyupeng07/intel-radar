"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  configuredPassword,
  isPasswordValid,
  safeNextPath,
} from "@/lib/auth"
import { logWarn } from "@/lib/server/logger"

export type LoginState = {
  error?: string
}

/** 简单节流：同一 IP 10 分钟内失败 6 次后要求等待（单实例内存计数足够）。 */
const FAILURE_WINDOW_MS = 10 * 60 * 1000
const MAX_FAILURES = 6
const failures = new Map<string, { count: number; resetAt: number }>()

function clientKey(ip: string | null): string {
  return ip?.split(",")[0]?.trim() || "unknown"
}

function tooManyFailures(key: string): boolean {
  const entry = failures.get(key)
  if (!entry) return false
  if (Date.now() > entry.resetAt) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function recordFailure(key: string): void {
  const now = Date.now()
  const entry = failures.get(key)
  if (!entry || now > entry.resetAt) {
    failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS })
    return
  }
  entry.count += 1
}

async function cookieSecurity(): Promise<{ secure: boolean }> {
  const headerStore = await headers()
  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim()
  return { secure: proto === "https" }
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const next = safeNextPath(formData.get("next"))
  const password = String(formData.get("password") ?? "")
  const expected = configuredPassword()

  if (!expected) {
    return { error: "服务端还没有配置访问口令（APP_AUTH_PASSWORD）" }
  }

  const headerStore = await headers()
  const key = clientKey(headerStore.get("x-forwarded-for"))

  if (tooManyFailures(key)) {
    return { error: "尝试次数过多，请 10 分钟后再试" }
  }

  if (!password.trim()) {
    return { error: "请输入访问口令" }
  }

  if (!(await isPasswordValid(password, expected))) {
    recordFailure(key)
    logWarn("auth.login_failed", { ip: key })
    // 轻微延迟，降低批量尝试的速度；正常手误只多等 300ms。
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { error: "口令不正确，请重新输入" }
  }

  failures.delete(key)
  const token = await createSessionToken(expected)
  const store = await cookies()
  const { secure } = await cookieSecurity()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })

  // redirect 会抛 NEXT_REDIRECT，必须放在 try/catch 之外。
  redirect(next)
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect("/login")
}
