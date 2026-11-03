import * as React from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { BriefSources } from "@/components/intel/briefs/sources/brief-sources"
import { SourceCitation } from "@/components/intel/briefs/sources/source-citation"
import type { ChatSource } from "@/components/intel/briefs/sources/source-types"
import { extractHeadings, linkCitations } from "@/lib/brief-markdown"
import type { Brief, BriefReport, IntelItem } from "@/lib/intel"

type ResolvedSource = ChatSource & { n: number }

function sourceDate(item: IntelItem, time?: string) {
  const monthDay = time?.match(/^(\d{1,2})-(\d{1,2})/)
  if (monthDay) {
    return `${item.date.slice(0, 4)}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`
  }
  const full = time?.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (full) return `${full[1]}-${full[2]}-${full[3]}`
  return item.date
}

function resolveSources(
  report: BriefReport,
  items: IntelItem[]
): ResolvedSource[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return report.sourceIds.map((id, index) => {
    const item = byId.get(id)
    const primary = item?.sources[0]
    return {
      n: index + 1,
      title: item?.title ?? id,
      url: primary?.url ?? "#",
      siteName: primary?.site ?? "",
      siteIcon: primary?.icon ?? undefined,
      date: item ? sourceDate(item, primary?.time) : primary?.time ?? undefined,
      snippet: item?.summary ?? "",
    }
  })
}

/**
 * 日报正文完全按 AI 返回的 Markdown 渲染。
 * 目录与标题 id 共用 extractHeadings 的结果，保证锚点一致。
 */
export function BriefBody({
  brief,
  report,
  items,
  markdown,
}: {
  brief: Brief
  report: BriefReport
  items: IntelItem[]
  markdown: string
}) {
  const sources = resolveSources(report, items)
  const headings = extractHeadings(markdown)
  let headingIndex = 0

  const components: Components = {
    h2: ({ children }) => {
      const heading = headings[headingIndex]
      headingIndex += 1
      return (
        <h2
          id={heading?.id}
          className="text-display mt-12 scroll-mt-6 text-2xl leading-tight first:mt-0 md:text-3xl"
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => (
      <h3 className="mt-6 scroll-mt-6 text-sm font-semibold">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mt-4 text-[15px] leading-8 text-foreground/78">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-8 text-foreground/78 marker:text-primary/70">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-8 text-foreground/78 marker:text-primary/70">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith("#source-")) {
        const index = Number(href.slice("#source-".length))
        const source = sources[index - 1]
        if (source) return <SourceCitation source={source} index={index} />
        return <>{children}</>
      }
      return (
        <a
          href={href}
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
          className="text-foreground underline underline-offset-2"
        >
          {children}
        </a>
      )
    },
    blockquote: ({ children }) => (
      <blockquote className="mt-6 rounded-r-2xl border-l-2 border-primary/60 bg-primary/[0.04] py-1 pl-5 text-[15px] leading-8 text-foreground/75">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-8 border-border" />,
    code: ({ children }) => (
      <code className="rounded bg-muted px-1 py-0.5 text-[12px]">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="mt-4 overflow-x-auto rounded-lg bg-muted px-3 py-2.5 text-xs leading-6">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b px-2 py-1.5 text-left font-medium">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border-b px-2 py-1.5 text-foreground/75">{children}</td>
    ),
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} className="mt-4 max-w-full rounded-lg border" />
    ),
  }

  return (
    <>
      <div className="brief-prose border-t border-border/70 pt-7">
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {linkCitations(markdown)}
        </Markdown>
      </div>

      <div className="mt-10 border-t pt-5">
        <BriefSources sources={sources} />
      </div>

      <p className="mt-8 border-t pt-5 text-[11px] leading-relaxed text-muted-foreground">
        本期由系统整合 {brief.items} 条情报后生成，于 {brief.publishedAt} 发布。
        文中数字标签可查看来源；事实与情报洞察分列，情报洞察部分为模型观点，不构成投资建议。
      </p>
    </>
  )
}
