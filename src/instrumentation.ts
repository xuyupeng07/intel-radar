/**
 * Next.js 启动钩子：只在 Node server 进程启动调度器。
 * 构建阶段和 Edge runtime 不启动，避免 build 时误触发采集。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.NEXT_PHASE === "phase-production-build") return

  const { startScheduler } = await import("./lib/server/scheduler")
  startScheduler()
}
