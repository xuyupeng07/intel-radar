import * as React from "react"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MobileList, MobileRow } from "@/components/mobile-list"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: string
  header?: React.ReactNode
  cell: (row: T) => React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
  headerClassName?: string
  sortable?: boolean
}

export type DataTableMobile<T> = {
  title: (row: T) => React.ReactNode
  description?: (row: T) => React.ReactNode
  meta?: (row: T) => React.ReactNode
  trailing?: (row: T) => React.ReactNode
  leading?: (row: T) => React.ReactNode
  onSelect?: (row: T) => void
}

export type DataTableSort = {
  key: string
  direction: "asc" | "desc"
} | null

export type DataTableSelection<T> = {
  selectedKeys: Set<React.Key>
  onToggle: (key: React.Key) => void
  onToggleAll: () => void
  allSelected: boolean
  someSelected: boolean
  label?: (row: T) => string
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const

/**
 * 列表页表格骨架：列定义 + 排序 + 多选 + 空态 + 移动端降级，一处维护。
 *
 * 只负责"怎么排"，不负责取数、筛选、分页 —— 那些留在页面或领域组件里，
 * 因为每个域的分页/筛选语义不同（有的进 URL，有的只在本页）。
 * 容器查询断点固定 660px，与 kit 的列表页模板一致。
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  mobile,
  onRowClick,
  sort,
  onSortChange,
  selection,
  rowActions,
  footer,
  renderRow,
  className,
  tableClassName,
  padded = true,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => React.Key
  empty?: React.ReactNode
  mobile?: DataTableMobile<T>
  onRowClick?: (row: T) => void
  sort?: DataTableSort
  onSortChange?: (key: string) => void
  selection?: DataTableSelection<T>
  /** 行尾「更多操作」列：给了就自动补表头与单元格，不用再手写最后两列 */
  rowActions?: (row: T) => React.ReactNode
  /** 表尾（合计 / 说明）；内容自己给 TableRow + TableCell + colSpan */
  footer?: React.ReactNode
  /** 自定义行元素：需要行级右键菜单 / 拖拽时用它，返回自己的 TableRow 包装 */
  renderRow?: (row: T, cells: React.ReactNode) => React.ReactNode
  className?: string
  tableClassName?: string
  padded?: boolean
}) {
  if (rows.length === 0) {
    return <div className={cn("@container", className)}>{empty ?? null}</div>
  }

  const selected = (row: T) => selection?.selectedKeys.has(rowKey(row)) ?? false

  return (
    <div className={cn("@container", className)}>
      {mobile ? (
        <MobileList className="@[660px]:hidden">
          {rows.map((row) => (
            <MobileRow
              key={rowKey(row)}
              leading={mobile.leading?.(row)}
              title={mobile.title(row)}
              description={mobile.description?.(row)}
              meta={mobile.meta?.(row)}
              trailing={mobile.trailing?.(row)}
              onSelect={mobile.onSelect ? () => mobile.onSelect?.(row) : undefined}
            />
          ))}
        </MobileList>
      ) : null}

      <div className={cn(mobile && "hidden @[660px]:block")}>
        <Table
          className={cn(
            padded &&
              "[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4",
            tableClassName
          )}
        >
          <TableHeader>
            <TableRow>
              {selection ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected && !selection.allSelected}
                    onCheckedChange={selection.onToggleAll}
                    aria-label="全选当前页"
                  />
                </TableHead>
              ) : null}
              {columns.map((column) => {
                const activeSort = sort?.key === column.key ? sort : null
                const ariaSort = activeSort
                  ? activeSort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : column.sortable
                    ? "none"
                    : undefined

                return (
                  <TableHead
                    key={column.key}
                    aria-sort={ariaSort}
                    className={cn(
                      column.align && alignClass[column.align],
                      column.headerClassName
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {column.header}
                        <HugeiconsIcon
                          icon={
                            activeSort?.direction === "desc" ? ArrowDown01Icon : ArrowUp01Icon
                          }
                          className={cn("size-3", activeSort ? "opacity-100" : "opacity-30")}
                          strokeWidth={2}
                        />
                      </button>
                    ) : (
                      (column.header ?? <span className="sr-only">操作</span>)
                    )}
                  </TableHead>
                )
              })}
              {rowActions ? (
                <TableHead className="w-10 pr-4">
                  <span className="sr-only">操作</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const cells = (
                <>
                  {selection ? (
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selected(row)}
                        onCheckedChange={() => selection.onToggle(rowKey(row))}
                        aria-label={selection.label?.(row) ?? "选择行"}
                      />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.align && alignClass[column.align], column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="pr-4">{rowActions(row)}</TableCell>
                  ) : null}
                </>
              )

              if (renderRow) {
                return (
                  <React.Fragment key={rowKey(row)}>{renderRow(row, cells)}</React.Fragment>
                )
              }

              return (
                <TableRow
                  key={rowKey(row)}
                  data-state={selected(row) ? "selected" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          onRowClick(row)
                        }
                      : undefined
                  }
                  className={cn(
                    onRowClick &&
                      "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  )}
                >
                  {cells}
                </TableRow>
              )
            })}
          </TableBody>
          {footer ? <TableFooter>{footer}</TableFooter> : null}
        </Table>
      </div>
    </div>
  )
}
