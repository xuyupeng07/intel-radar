"use server"

import { revalidatePath } from "next/cache"

import { runIngest } from "@/lib/server/ingest"
import { logError } from "@/lib/server/logger"
import { isValidDateString, todayInShanghai } from "@/lib/server/time"
import { getActiveWorkspace } from "@/lib/server/workspace"

export type TriggerIngestResult =
  | {
      ok: true
      workspace: string
      date: string
      items: number
      briefTitle: string
      totalMs: number
    }
  | { ok: false; error: string }

/**
 * 页面内的采集入口。与 /api/intel/ingest 共用同一套 runIngest，
 * 但走 Server Action，避免把 INGEST_TOKEN 暴露到浏览器。
 */
export async function triggerIngestAction(date?: string): Promise<TriggerIngestResult> {
  const target = isValidDateString(date) ? date : todayInShanghai()

  try {
    const workspace = await getActiveWorkspace()
    const result = await runIngest(workspace, target)
    revalidatePath("/today")
    revalidatePath("/briefs")
    revalidatePath("/admin")
    revalidatePath("/runs")
    return {
      ok: true,
      workspace: workspace.id,
      date: result.date,
      items: result.items.length,
      briefTitle: result.brief.title,
      totalMs: result.timings.totalMs,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logError("action.ingest_failed", { date: target, message: message.slice(0, 300) })
    return { ok: false, error: message }
  }
}
