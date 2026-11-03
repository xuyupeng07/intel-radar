import { redirect } from "next/navigation"

/**
 * 旧卡片视图入口保留为重定向：卡片已成为 /today 的唯一视图。
 */
export default async function LegacyCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; section?: string }>
}) {
  const { date, section } = await searchParams
  const params = new URLSearchParams()
  if (date) params.set("date", date)
  if (section) params.set("section", section)
  const query = params.toString()
  redirect(query ? `/today?${query}` : "/today")
}
