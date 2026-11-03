import { NextResponse } from "next/server"

import { getDb } from "@/lib/server/db/client"
import { schemaVersion } from "@/lib/server/db/migrate"
import { countBriefs } from "@/lib/server/repositories/briefs"
import { countItems } from "@/lib/server/repositories/items"
import { configuredPassword } from "@/lib/auth"
import { getActiveWorkspace } from "@/lib/server/workspace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const startedAt = Date.now()

/**
 * 健康检查：容器 HEALTHCHECK 与 Sealos 探针都用它，所以不做鉴权、也不做重活。
 * 只读一张表 + 迁移版本，够判断「进程活着 + SQLite 可读 + schema 已就位」。
 */
export async function GET() {
  const began = Date.now()
  try {
    const workspace = await getActiveWorkspace()
    const [items, briefs] = await Promise.all([
      countItems(workspace.id),
      countBriefs(workspace.id),
    ])
    const db = getDb()
    const version =
      db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
        | { value: string }
        | undefined

    return NextResponse.json(
      {
        ok: true,
        database: "sqlite",
        schemaVersion: version?.value ?? schemaVersion(),
        workspace: workspace.id,
        items,
        briefs,
        auth: configuredPassword() ? "session" : "none",
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        durationMs: Date.now() - began,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "sqlite",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
