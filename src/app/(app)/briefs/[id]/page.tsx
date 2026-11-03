import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { PUBLISHED_BRIEFS } from "@/lib/intel"
import { getBriefArchive } from "@/lib/server/brief-archive"
import { getActiveWorkspace } from "@/lib/server/workspace"

export const metadata: Metadata = { title: "日报" }
export const dynamic = "force-dynamic"

/**
 * 旧的日报直达链接保留，统一重定向到阅读页的 `?id=` 视图，
 * 保证所有日报入口共用同一套固定页头与正文排版。
 * 被实时数据替换的样例 id，按同日期的最新一期落地。
 */
export default async function BriefRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const workspace = await getActiveWorkspace()
  const entries = await getBriefArchive(workspace.id)
  if (entries.some((entry) => entry.brief.id === id)) {
    redirect(`/briefs?id=${encodeURIComponent(id)}`)
  }

  const sample =
    workspace.id === "finance"
      ? PUBLISHED_BRIEFS.find((brief) => brief.id === id)
      : undefined
  const sameDate = sample
    ? entries.find((entry) => entry.brief.date === sample.date)
    : undefined
  if (sameDate) redirect(`/briefs?id=${encodeURIComponent(sameDate.brief.id)}`)

  notFound()
}
