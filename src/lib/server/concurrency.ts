/**
 * 有并发上限的批量执行。
 *
 * 采集会同时打 `检索词 × 搜索源` 个请求（6 条 × 4 源 = 24，最多 8 × 4 = 32），
 * 一次性 Promise.all 容易被供应商限流，也会把内存峰值拉高；
 * 这里按固定并发窗口跑完并保持结果顺序，方便和任务列表一一对应。
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const size = Math.max(1, Math.min(limit, items.length || 1))
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = { status: "fulfilled", value: await run(items[index], index) }
      } catch (error) {
        results[index] = { status: "rejected", reason: error }
      }
    }
  }

  await Promise.all(Array.from({ length: size }, () => worker()))
  return results
}
