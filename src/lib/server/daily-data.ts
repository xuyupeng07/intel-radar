import "server-only"

import type { IntelItem } from "@/lib/intel"
import type { WorkspaceId } from "@/lib/workspaces"
import { listAllItems, listItemDates } from "@/lib/server/repositories/items"

export type DailyData = {
  items: IntelItem[]
  dates: string[]
}

/** 每日情报：只从数据库读，SQLite 在首次访问时自动建表并 seed。 */
export async function getDailyData(workspaceId: WorkspaceId): Promise<DailyData> {
  const [items, dates] = await Promise.all([
    listAllItems(workspaceId),
    listItemDates(workspaceId),
  ])
  return { items, dates }
}
