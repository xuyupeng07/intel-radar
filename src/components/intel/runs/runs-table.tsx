"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data/data-table"
import { EmptyIllustration } from "@/components/intel/empty-illustration"
import { TablePagination } from "@/components/data/table-pagination"
import { TableToolbar } from "@/components/data/table-toolbar"
import { SegmentedControl } from "@/components/segmented-control"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { triggerIngestAction } from "@/lib/server/actions/ingest"
import type { RunRecord } from "@/lib/server/repositories/runs"

const FILTERS = ["全部", "成功", "失败", "跳过", "运行中"]
const PAGE_SIZE = 8

export function RunsTable({ runs }: { runs: RunRecord[] }) {
  const router = useRouter()
  const [status, setStatus] = React.useState("全部")
  const [page, setPage] = React.useState(1)
  const [retrying, setRetrying] = React.useState<string | null>(null)

  const filtered = status === "全部" ? runs : runs.filter((run) => run.status === status)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const options = FILTERS.map((value) => ({
    value,
    label:
      value === "全部"
        ? `全部 ${runs.length}`
        : `${value} ${runs.filter((run) => run.status === value).length}`,
    disabled: value !== "全部" && runs.every((run) => run.status !== value),
  }))

  async function retry(run: RunRecord) {
    setRetrying(run.id)
    const result = await triggerIngestAction(run.date)
    setRetrying(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`重新采集完成：${result.items} 条情报`)
    router.refresh()
  }

  const columns: DataTableColumn<RunRecord>[] = [
    {
      key: "job",
      header: "任务",
      className: "w-[124px] align-top text-xs",
      cell: (run) => run.job,
    },
    {
      key: "target",
      header: "目标",
      className: "align-top",
      cell: (run) => (
        <>
          <p className="text-sm">{run.target}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {run.error ?? run.detail}
          </p>
        </>
      ),
    },
    {
      key: "status",
      header: "状态",
      className: "w-[88px] align-top",
      cell: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: "startedAt",
      header: "开始",
      align: "right",
      className: "w-[132px] align-top text-xs text-muted-foreground tabular-nums",
      cell: (run) => `${run.date.slice(5)} ${run.startedAt}`,
    },
    {
      key: "duration",
      header: "耗时",
      align: "right",
      className: "w-[76px] align-top text-xs text-muted-foreground tabular-nums",
      cell: (run) => run.duration,
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      className: "w-[88px] align-top",
      cell: (run) =>
        run.status === "失败" ? (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            disabled={retrying === run.id}
            onClick={() => retry(run)}
          >
            {retrying === run.id ? "重试中…" : "重试"}
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-0 overflow-hidden py-0">
        <TableToolbar
          tabs={
            <SegmentedControl
              options={options}
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              className="w-max"
            />
          }
          actions={
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                router.refresh()
                toast.success("运行记录已刷新")
              }}
            >
              <HugeiconsIcon icon={Refresh01Icon} className="size-3" strokeWidth={2} />
              刷新
            </Button>
          }
        />

        <CardContent className="p-0">
          <DataTable
            rows={paged}
            columns={columns}
            rowKey={(run) => run.id}
            empty={
              <Empty className="border-0 py-14">
                <EmptyHeader>
                  <EmptyIllustration variant="searching" size="sm" />
                  <EmptyTitle>没有这类任务</EmptyTitle>
                  <EmptyDescription>切回「全部」查看完整任务流水。</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatus("全部")
                      setPage(1)
                    }}
                  >
                    查看全部
                  </Button>
                </EmptyContent>
              </Empty>
            }
            mobile={{
              title: (run) => run.target,
              description: (run) => run.error ?? run.detail,
              meta: (run) =>
                `${run.job} · ${run.date.slice(5)} ${run.startedAt} · ${run.duration}`,
              trailing: (run) => (
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={run.status} />
                  {run.status === "失败" ? (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={retrying === run.id}
                      onClick={() => retry(run)}
                    >
                      {retrying === run.id ? "重试中…" : "重新采集"}
                    </Button>
                  ) : null}
                </div>
              ),
            }}
          />
        </CardContent>

        {filtered.length > 0 ? (
          <TablePagination
            total={filtered.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        重试会重新执行该日期的一轮完整采集与日报生成；成功或失败都会追加新的运行记录，
        旧记录保留，便于对照。
      </p>
    </div>
  )
}
