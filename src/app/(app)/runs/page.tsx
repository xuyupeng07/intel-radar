import { IngestButton } from "@/components/intel/ingest-button"
import { PageContainer, PageHeader } from "@/components/page-header"
import { RunsTable } from "@/components/intel/runs/runs-table"
import { listRuns } from "@/lib/server/repositories/runs"
import { getActiveWorkspace } from "@/lib/server/workspace"

export const metadata = { title: "运行记录" }
export const dynamic = "force-dynamic"
export const maxDuration = 300

export default async function RunsPage() {
  const workspace = await getActiveWorkspace()
  const runs = await listRuns(workspace.id, 200)

  return (
    <PageContainer>
      <PageHeader
        title="运行记录"
        description={`${workspace.name}的采集与日报生成流水。失败会保留错误信息，可以直接重新采集该日期。`}
      >
        <IngestButton label="立即采集" />
      </PageHeader>
      <RunsTable runs={runs} />
    </PageContainer>
  )
}
