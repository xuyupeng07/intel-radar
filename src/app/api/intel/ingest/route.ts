import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { runIngest } from "@/lib/server/ingest"
import { logError } from "@/lib/server/logger"
import { isValidDateString, todayInShanghai } from "@/lib/server/time"
import { getActiveWorkspace } from "@/lib/server/workspace"
import { hydrateWorkspace } from "@/lib/workspaces"
import { getWorkspaceRecord } from "@/lib/server/repositories/workspaces"

export const runtime = "nodejs"
export const maxDuration = 300

/** 定长比较，避免按字符逐位比较泄露 token。 */
function tokenMatches(request: Request): boolean {
  const expected = process.env.INGEST_TOKEN?.trim()
  if (!expected) return true
  const provided = request.headers.get("x-ingest-token")?.trim() ?? ""
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!tokenMatches(request)) {
    return NextResponse.json({ ok: false, error: "无效的 ingest token" }, { status: 401 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get("date") ?? todayInShanghai()
  const requestedWorkspace = url.searchParams.get("workspace")

  if (!isValidDateString(date)) {
    return NextResponse.json(
      { ok: false, error: "date 需为真实存在的 YYYY-MM-DD" },
      { status: 400 }
    )
  }
  if (requestedWorkspace && !getWorkspaceRecord(requestedWorkspace)) {
    return NextResponse.json(
      { ok: false, error: "workspace 只能是 finance 或 ai" },
      { status: 400 }
    )
  }

  const requestedRecord = requestedWorkspace
    ? getWorkspaceRecord(requestedWorkspace)
    : null
  const workspace = requestedRecord
    ? hydrateWorkspace(requestedRecord)
    : await getActiveWorkspace()

  try {
    const day = await runIngest(workspace, date)
    return NextResponse.json({
      ok: true,
      workspace: { id: workspace.id, name: workspace.name },
      date,
      generatedAt: day.generatedAt,
      items: day.items.length,
      brief: {
        id: day.brief.id,
        title: day.brief.title,
        mode: day.briefMode,
        sections: day.report.sections.length,
        takeaways: day.report.takeaways.length,
      },
      queries: day.queries,
      providers: day.providers,
      events: day.events,
      funnel: day.funnel,
      timings: day.timings,
      runs: day.runs,
      sample: day.items.slice(0, 3).map((item) => ({
        title: item.title,
        site: item.sources[0]?.site,
        section: item.section,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logError("api.ingest_failed", {
      workspace: workspace.id,
      date,
      message: message.slice(0, 300),
    })
    // 409 表示「已有采集在跑」，脚本可以据此退避重试。
    const status = /已有采集在运行/.test(message) ? 409 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function GET() {
  return NextResponse.json({
    hint: "POST /api/intel/ingest?date=YYYY-MM-DD&workspace=ai 触发一次搜索源抓取与日报生成；不传 workspace 时用当前 cookie",
    auth: process.env.INGEST_TOKEN ? "需要 x-ingest-token 请求头" : "本地未启用 token",
  })
}
