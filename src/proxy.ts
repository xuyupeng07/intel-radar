import { NextResponse, type NextRequest } from "next/server"

import {
  AUTH_NOT_CONFIGURED_BODY,
  SESSION_COOKIE,
  configuredPassword,
  verifySessionToken,
} from "@/lib/auth"

/**
 * 访问控制。
 *
 * - 配置了 `APP_AUTH_PASSWORD` 后：页面与 API 都要求登录会话（`/login` 签发 httpOnly cookie）；
 * - 未配置时：开发环境放行，生产环境除 `/api/health` 外返回 503 并提示配置；
 * - `/login`、`/api/health` 永远放行；
 * - `/api/intel/ingest` 允许用 `x-ingest-token` 顶替会话，方便定时脚本。
 */

const PUBLIC_PATHS = new Set(["/login", "/api/health"])

function textResponse(status: number, body: string) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

function deny(request: NextRequest, status: number, message: string) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: message.trim(), auth: "required" },
      { status, headers: { "Cache-Control": "no-store" } }
    )
  }
  return textResponse(status, message)
}

/** 定长比较：不给按字符提前返回的时序侧信道。 */
function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

function ingestTokenMatches(request: NextRequest): boolean {
  const token = process.env.INGEST_TOKEN?.trim()
  if (!token) return false
  const provided = request.headers.get("x-ingest-token")?.trim()
  if (!provided) return false
  return constantTimeEqual(provided, token)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const password = configuredPassword()

  // 未配置口令：本地开发直接放行，生产环境拒绝并给出配置说明。
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next()
    if (pathname === "/api/intel/ingest" && ingestTokenMatches(request)) {
      return NextResponse.next()
    }
    console.warn(
      "[auth] APP_AUTH_PASSWORD 未配置，生产环境拒绝访问（/api/health 除外）"
    )
    return deny(request, 503, AUTH_NOT_CONFIGURED_BODY)
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token && (await verifySessionToken(token, password))) {
    return NextResponse.next()
  }

  if (pathname === "/api/intel/ingest" && ingestTokenMatches(request)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return deny(request, 401, "需要登录")
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.search = ""
  const target = `${pathname}${search}`
  if (target !== "/") loginUrl.searchParams.set("next", target)
  return NextResponse.redirect(loginUrl)
}

export default proxy

export const config = {
  matcher: [
    // 静态资源与图片不经过校验，避免每个字体 / 图标都触发一次鉴权。
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
}
