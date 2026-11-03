import "server-only"

import { runIngest } from "@/lib/server/ingest"
import { logError, logInfo, logWarn } from "@/lib/server/logger"
import { hydrateWorkspace, type Workspace } from "@/lib/workspaces"
import { listWorkspaces } from "@/lib/server/repositories/workspaces"
import {
  claimScheduledRun,
  finishScheduledRun,
} from "@/lib/server/repositories/scheduled-runs"
import {
  getProviderCredential,
  getSettings,
} from "@/lib/server/repositories/settings"
import {
  isoWeekdayInShanghai,
  nowTimeInShanghai,
  todayInShanghai,
} from "@/lib/server/time"

const TICK_MS = 30_000
const STARTUP_DELAY_MS = 8_000
const GRACE_MINUTES = 5

type SchedulerGlobal = {
  timer?: ReturnType<typeof setInterval>
  startupTimer?: ReturnType<typeof setTimeout>
}

const globalForScheduler = globalThis as unknown as {
  __intelRadarScheduler?: SchedulerGlobal
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

function isDue(now: string, scheduled: string, catchUp: boolean): boolean {
  const current = timeToMinutes(now)
  const target = timeToMinutes(scheduled)
  if (catchUp) return current >= target
  // 正常按分钟触发；额外留 5 分钟窗口，避免服务刚好在 08:00 启动时错过。
  return current >= target && current - target <= GRACE_MINUTES
}

let ticking = false

/**
 * 每分钟检查一次（每 30 秒 tick），由 scheduled_runs 主键抢占执行权。
 * 这是本地单进程方案：Next server 必须保持运行；进程停止时不会执行。
 */
export async function tickScheduler(now = new Date()): Promise<void> {
  if (ticking) return
  ticking = true
  try {
    const date = todayInShanghai()
    const time = nowTimeInShanghai()
    const weekday = isoWeekdayInShanghai(now)

    for (const record of listWorkspaces()) {
      const workspace = hydrateWorkspace(record)
      const settings = await getSettings(workspace.id)
      if (!settings.scheduleEnabled) continue
      // 一个能用的 Key 都没有时跑也只会留失败记录：跳过并记一条日志。
      const hasKey = settings.searchProviders.some((providerId) =>
        Boolean(getProviderCredential(workspace.id, providerId))
      )
      if (!hasKey) {
        logWarn("scheduler.skip_no_key", { workspace: workspace.id })
        continue
      }
      if (!settings.scheduleDays.includes(weekday)) continue
      if (!isDue(time, settings.scheduleTime, settings.scheduleCatchUp)) continue
      if (!claimScheduledRun(workspace.id, date, settings.scheduleTime)) continue

      logInfo("scheduler.start", {
        workspace: workspace.id,
        date,
        time,
        scheduled: settings.scheduleTime,
      })
      try {
        await execute(workspace, date)
        finishScheduledRun(workspace.id, date, settings.scheduleTime, "success")
        logInfo("scheduler.success", { workspace: workspace.id, date })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        finishScheduledRun(
          workspace.id,
          date,
          settings.scheduleTime,
          "failed",
          message
        )
        logError("scheduler.failed", {
          workspace: workspace.id,
          date,
          message: message.slice(0, 300),
        })
      }
    }
  } finally {
    ticking = false
  }
}

async function execute(workspace: Workspace, date: string): Promise<void> {
  await runIngest(workspace, date)
}

export function startScheduler(): void {
  if (globalForScheduler.__intelRadarScheduler) return

  const startupTimer = setTimeout(() => {
    void tickScheduler().catch((error) =>
      logError("scheduler.startup_tick_failed", {
        message: error instanceof Error ? error.message : String(error),
      })
    )
  }, STARTUP_DELAY_MS)
  startupTimer.unref?.()

  const timer = setInterval(() => {
    void tickScheduler().catch((error) =>
      logError("scheduler.tick_failed", {
        message: error instanceof Error ? error.message : String(error),
      })
    )
  }, TICK_MS)
  timer.unref?.()

  globalForScheduler.__intelRadarScheduler = { timer, startupTimer }
  logInfo("scheduler.ready", {
    tickMs: TICK_MS,
    graceMinutes: GRACE_MINUTES,
    timezone: "Asia/Shanghai",
  })
}
