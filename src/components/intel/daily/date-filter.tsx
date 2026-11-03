"use client"

import * as React from "react"
import { Calendar03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function toISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DateFilter({
  value,
  onChange,
  daysWithData,
  today: todayISO,
}: {
  value: string
  onChange: (date: string) => void
  daysWithData: number
  today: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDate(value)
  const today = parseDate(todayISO)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`选择日期，当前 ${value}`}
            className="h-9 shrink-0 gap-1.5 rounded-full border-border/70 bg-background/50 px-3 text-[11px] font-normal"
          />
        }
      >
        <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" strokeWidth={2} />
        <span className="tabular-nums">{value.replaceAll("-", "/")}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(next) => {
            if (!next) return
            onChange(toISO(next))
            setOpen(false)
          }}
          disabled={{ after: today }}
          startMonth={new Date(today.getFullYear(), today.getMonth() - 3, 1)}
          endMonth={today}
          captionLayout="dropdown"
          formatters={{
            formatMonthDropdown: (month) => `${month.getMonth() + 1} 月`,
            formatYearDropdown: (year) => `${year.getFullYear()} 年`,
            formatWeekdayName: (weekday) =>
              ["日", "一", "二", "三", "四", "五", "六"][weekday.getDay()],
          }}
          labels={{
            labelMonthDropdown: () => "月份",
            labelYearDropdown: () => "年份",
            labelNext: () => "下个月",
            labelPrevious: () => "上个月",
          }}
          className="p-3"
        />
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onChange(todayISO)
              setOpen(false)
            }}
          >
            回到今天
          </Button>
          <span className="text-[11px] text-muted-foreground">{daysWithData} 天有数据</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
