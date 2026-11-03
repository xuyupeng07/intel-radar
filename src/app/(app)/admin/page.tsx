import { AdminOverview } from "@/components/intel/admin/overview"

export const metadata = { title: "运营看板" }
export const dynamic = "force-dynamic"
export const maxDuration = 300

export default function AdminPage() {
  return <AdminOverview />
}
