"use client"

import { useRouter } from "next/navigation"

import { DateFilter } from "@/components/intel/daily/date-filter"

export function CardDatePicker({
  date,
  sectionSlug,
  daysWithData,
  defaultDate,
  today,
}: {
  date: string
  sectionSlug?: string
  daysWithData: number
  defaultDate: string
  today: string
}) {
  const router = useRouter()

  return (
    <DateFilter
      value={date}
      daysWithData={daysWithData}
      today={today}
      onChange={(next) => {
        const params = new URLSearchParams()
        if (next !== defaultDate) params.set("date", next)
        if (sectionSlug) params.set("section", sectionSlug)
        const query = params.toString()
        router.push(`/today${query ? `?${query}` : ""}`)
      }}
    />
  )
}
