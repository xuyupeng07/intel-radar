/**
 * 骨架验收脚本：截取全部路由，检查移动端是否横向溢出。
 *
 * 用法：
 *   pnpm build && pnpm exec next start -p 4310
 *   node scripts/verify-ui.mjs
 *
 * 依赖本机 Google Chrome；输出到 docs/ui-preview/。
 */
import { chromium } from "playwright-core"
import fs from "node:fs"

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4310"
const OUT = "docs/ui-preview"
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const ROUTES = [
  ["today", "/today"],
  ["today-section", "/today?section=trend"],
  ["today-yesterday", "/today?date=2026-10-27&section=trend"],
  ["briefs", "/briefs"],
  ["brief-detail", "/briefs/b-1028"],
  ["admin", "/admin"],
  ["runs", "/runs"],
  ["settings", "/settings"],
]

const MOBILE = [
  ["m-today", "/today"],
  ["m-today-yesterday", "/today?date=2026-10-27"],
  ["m-briefs", "/briefs"],
  ["m-brief-detail", "/briefs/b-1028"],
  ["m-admin", "/admin"],
  ["m-runs", "/runs"],
  ["m-settings", "/settings"],
]

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const report = []
const tableAudits = []

async function hasOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const app = document.querySelector("[data-app-scroll]")
    return (
      doc.scrollWidth > doc.clientWidth + 1 ||
      Boolean(app && app.scrollWidth > app.clientWidth + 1)
    )
  })
}

for (const [name, path] of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  // 页面标题左边界必须与其它页一致：这是「切页不横跳」的硬指标
  const h1Left = await page.evaluate(() => {
    const h1 = document.querySelector("h1")
    return h1 ? Math.round(h1.getBoundingClientRect().left) : null
  })
  // 卡片内的表格必须贴底：表尾到卡片底边的距离 ≤ 1px
  const tableGaps = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="card"]')].flatMap((card) => {
      const table = card.querySelector("table")
      const lastRow = table?.querySelector("tbody tr:last-child")
      if (!table || !lastRow) return []
      // 表格必须是卡片里的最后一块内容；后面还有 footer / 说明的卡片不算贴底
      let node = table
      while (node && node !== card) {
        if (node.nextElementSibling) return []
        node = node.parentElement
      }
      const gap = Math.round(
        card.getBoundingClientRect().bottom - lastRow.getBoundingClientRect().bottom
      )
      return [{ gap, card: (card.textContent ?? "").trim().slice(0, 16) }]
    })
  )
  report.push({
    name,
    status: response?.status(),
    overflow: await hasOverflow(page),
    h1Left,
    tableGap: tableGaps.length > 0 ? Math.max(...tableGaps.map((item) => item.gap)) : null,
  })
  tableAudits.push({ path, gaps: tableGaps })
  await page.close()
}

for (const [name, path] of MOBILE) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  const overflow = await hasOverflow(page)
  report.push({ name, status: response?.status(), overflow })
  await page.close()
}

// AI 工作区：同一套路由，cookie 指定 workspace=ai
const AI_ROUTES = [
  ["ai-today", "/today"],
  ["ai-briefs", "/briefs"],
  ["ai-admin", "/admin"],
  ["ai-runs", "/runs"],
  ["ai-settings", "/settings"],
]
const host = new URL(BASE).hostname
const aiContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
await aiContext.addCookies([
  { name: "intel_workspace", value: "ai", domain: host, path: "/" },
])
const aiPage = await aiContext.newPage()
for (const [name, path] of AI_ROUTES) {
  const response = await aiPage.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await aiPage.waitForTimeout(200)
  await aiPage.screenshot({ path: `${OUT}/${name}.png` })
  const h1Left = await aiPage.evaluate(() => {
    const h1 = document.querySelector("h1")
    return h1 ? Math.round(h1.getBoundingClientRect().left) : null
  })
  report.push({ name, status: response?.status(), overflow: await hasOverflow(aiPage), h1Left })
}
const aiMobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
await aiMobileContext.addCookies([
  { name: "intel_workspace", value: "ai", domain: host, path: "/" },
])
const aiMobile = await aiMobileContext.newPage()
const aiMobileResponse = await aiMobile.goto(`${BASE}/today`, { waitUntil: "networkidle" })
await aiMobile.waitForTimeout(200)
await aiMobile.screenshot({ path: `${OUT}/m-ai-today.png` })
const aiMobileOverflow = await hasOverflow(aiMobile)
report.push({ name: "m-ai-today", status: aiMobileResponse?.status(), overflow: aiMobileOverflow })
await aiMobileContext.close()
await aiContext.close()

await browser.close()
console.table(report)

const lefts = [
  ...new Set(
    report.map((item) => item.h1Left).filter((value) => typeof value === "number")
  ),
]
if (lefts.length > 1) {
  console.error(
    `标题左边界不一致：${lefts.join(" / ")} px —— 检查是否是某个页面给 PageContainer 传了 max-w-*`
  )
  process.exit(1)
}

const looseTables = tableAudits.flatMap(({ path, gaps }) =>
  gaps.filter((item) => item.gap > 1).map((item) => ({ path, ...item }))
)
if (looseTables.length > 0) {
  console.error(
    "卡片内表格没有贴底（表尾到卡片底边 > 1px）：",
    looseTables,
    "\n修法：Card 写 gap-0 overflow-hidden py-0，CardContent 写 p-0。"
  )
  process.exit(1)
}

const bad = report.filter((item) => item.status !== 200 || item.overflow)
if (bad.length > 0) {
  console.error("验收失败：", bad)
  process.exit(1)
}
console.log(`验收通过：全部路由 200，移动端无横向溢出，标题左边界统一为 ${lefts[0]}px。`)
