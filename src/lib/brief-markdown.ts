import type { BriefReport } from "@/lib/intel"

export type BriefHeading = {
  id: string
  label: string
}

function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .trim()
}

export function slugifyHeading(text: string): string {
  const slug = stripInline(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "section"
}

/** 从 Markdown 中提取二级标题，作为左侧目录。 */
export function extractHeadings(markdown: string): BriefHeading[] {
  const seen = new Map<string, number>()
  const headings: BriefHeading[] = []

  for (const line of markdown.split("\n")) {
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line.trim())
    if (!match) continue
    const label = stripInline(match[1])
    if (!label) continue

    let id = slugifyHeading(label)
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count + 1}`
    headings.push({ id, label })
  }

  return headings
}

/** 旧的结构化日报转成 Markdown，保证历史数据也走同一套渲染。 */
export function reportToMarkdown(report: BriefReport): string {
  const blocks: string[] = []
  if (report.lead.trim()) blocks.push("## 导语", report.lead.trim())
  for (const section of report.sections) {
    blocks.push(`## ${section.title}`)
    blocks.push(...section.paragraphs)
  }
  if (report.takeaways.length > 0) {
    blocks.push("## 情报洞察")
    blocks.push(...report.takeaways.map((takeaway) => `- ${takeaway}`))
  }
  return blocks.join("\n\n")
}

export function markdownForReport(report: BriefReport): string {
  return report.markdown?.trim() || reportToMarkdown(report)
}

const UNNUMBERED_HEADINGS = new Set(["导语", "情报洞察", "来源"])

/**
 * 日报小标题统一编号：导语 / 情报洞察 / 来源不编号，主题小节从 1. 开始。
 * 新提示词已经要求编号；这里兜底旧日报（01 格式）或模型漏编号的情况。
 */
export function numberSectionHeadings(markdown: string): string {
  let index = 0
  return markdown
    .split("\n")
    .map((line) => {
      const match = /^##\s+(.+?)\s*$/.exec(line.trim())
      if (!match) return line
      const label = stripInline(match[1])
      const title = label
        .replace(/^\d{1,2}\.\s+/, "")
        .replace(/^\d{2}\s+/, "")
        .trim()
      if (!title) return line
      if (title === "判断") return "## 情报洞察"
      if (UNNUMBERED_HEADINGS.has(title)) return line
      index += 1
      return `## ${index}. ${title}`
    })
    .join("\n")
}

/** `[1]` / `[2]` 引用转成来源锚点，交给 Markdown 渲染器。 */
export function linkCitations(markdown: string): string {
  return markdown.replace(/\[(\d+)\](?!\()/g, "[$1](#source-$1)")
}
