---
name: intel-radar
intent: Persuade
source: src/app/globals.css
colors:
  background:
    light: oklch(0.968 0.012 85)
    dark: oklch(0.115 0.015 275)
  foreground:
    light: oklch(0.165 0.018 275)
    dark: oklch(0.955 0.012 85)
  card:
    light: oklch(0.995 0.004 85)
    dark: oklch(0.165 0.02 275)
  card-foreground:
    light: oklch(0.165 0.018 275)
    dark: oklch(0.955 0.012 85)
  popover:
    light: oklch(0.995 0.004 85)
    dark: oklch(0.175 0.022 275)
  popover-foreground:
    light: oklch(0.165 0.018 275)
    dark: oklch(0.955 0.012 85)
  primary:
    light: oklch(0.18 0.02 275)
    dark: oklch(0.855 0.2 130)
  primary-foreground:
    light: oklch(0.985 0.008 85)
    dark: oklch(0.13 0.02 275)
  secondary:
    light: oklch(0.925 0.015 85)
    dark: oklch(0.21 0.025 275)
  secondary-foreground:
    light: oklch(0.22 0.02 275)
    dark: oklch(0.955 0.012 85)
  muted:
    light: oklch(0.925 0.013 85)
    dark: oklch(0.2 0.02 275)
  muted-foreground:
    light: oklch(0.49 0.022 275)
    dark: oklch(0.68 0.02 85)
  accent:
    light: oklch(0.9 0.045 125)
    dark: oklch(0.235 0.03 275)
  accent-foreground:
    light: oklch(0.18 0.02 275)
    dark: oklch(0.955 0.012 85)
  destructive:
    light: oklch(0.577 0.245 27.325)
    dark: oklch(0.704 0.191 22.216)
  border:
    light: oklch(0.875 0.014 85)
    dark: oklch(1 0 0 / 9%)
  input:
    light: oklch(0.89 0.012 85)
    dark: oklch(1 0 0 / 12%)
  ring:
    light: oklch(0.72 0.18 130)
    dark: oklch(0.855 0.2 130)
  chart-1:
    light: oklch(0.66 0.2 130)
    dark: oklch(0.855 0.2 130)
  chart-2:
    light: oklch(0.6 0.2 300)
    dark: oklch(0.72 0.18 300)
  chart-3:
    light: oklch(0.62 0.13 195)
    dark: oklch(0.74 0.13 195)
  chart-4:
    light: oklch(0.78 0.16 80)
    dark: oklch(0.84 0.15 85)
  chart-5:
    light: oklch(0.62 0.2 15)
    dark: oklch(0.72 0.18 20)
  sidebar:
    light: oklch(0.945 0.016 85)
    dark: oklch(0.09 0.012 275)
  nav-active:
    light: oklch(0.18 0.02 275)
    dark: oklch(0.855 0.2 130)
  nav-active-foreground:
    light: oklch(0.985 0.008 85)
    dark: oklch(0.13 0.02 275)
  sidebar-foreground:
    light: oklch(0.165 0.018 275)
    dark: oklch(0.955 0.012 85)
  sidebar-primary:
    light: oklch(0.18 0.02 275)
    dark: oklch(0.855 0.2 130)
  sidebar-primary-foreground:
    light: oklch(0.985 0.008 85)
    dark: oklch(0.13 0.02 275)
  sidebar-accent:
    light: oklch(0.18 0.02 275)
    dark: oklch(0.855 0.2 130)
  sidebar-accent-foreground:
    light: oklch(0.985 0.008 85)
    dark: oklch(0.13 0.02 275)
  sidebar-border:
    light: oklch(0.875 0.014 85)
    dark: oklch(1 0 0 / 7%)
  sidebar-ring:
    light: oklch(0.72 0.18 130)
    dark: oklch(0.855 0.2 130)
  signal:
    light: oklch(0.62 0.18 132)
    dark: oklch(0.855 0.2 130)
  signal-foreground:
    light: oklch(0.985 0.008 85)
    dark: oklch(0.13 0.02 275)
---

# 行业情报雷达 · 设计契约

## 概览

- **意图**：读者页 `Persuade`（`/today`、`/briefs`），运营页 `Operate`（`/admin`、`/runs`、`/settings`）；同一套视觉语言，信息密度按页面切换。
- **visual thesis**：像一本会发光的行业杂志——暖纸或深墨画布，超大衬线标题、信号绿、环境光和极细噪点；运营页保留数据密度，但不退回冷冰冰的后台模板。
- **design direction**：Neon Editorial / Signal Desk。深墨 + 信号绿 + 暖白；浅色是奶油纸 + 墨黑 + 深绿。`Instrument Serif` 只做拉丁展示，中文标题回退宋体，正文保持 Inter。
- **content plan**：读者页「日期 → 板块 → 卡片网格」；运营页「指标 → 板块分布 → 当前采集参数」。
- **interaction thesis**：日期与板块筛选即时生效并写进 URL，卡片网格就地换内容，外层不重排；写操作在按钮上给出进行中、成功或失败。
- **一个不同点**：每张情报卡只露一个来源，但保留「多源印证」与「查看详情」两个动作，读起来像一条有出处的电讯，而不是一张无来源的 AI 摘要。

**主题事实**

1. 用户是投研 / 战略 / 销售，早上五到八分钟扫完当天行业情报。
2. 有两个真实工作区：金融情报组与 AI 情报组；每个工作区只服务一个领域，数据完全隔离，读者页只按「板块」筛。
3. 一条情报只露一个来源；多源关系用「多源印证」徽标表达，不并排媒体名。
4. 日报是 AI 整合稿，不是条目列表。
5. 采集量、运行成功率只出现在 `/admin` 与 `/runs`，读者页不出现。
6. 深色是默认主题，浅色共用同一套 token。
7. 所有数字用等宽数字，表格与指标靠右对齐。
8. 读者页面向「今天有什么」，运营页面向「系统跑得怎么样」。

## 颜色

- {colors.background} 是画布，{colors.card} 承载卡片与表格；深色下卡片比画布亮一档，形成层级。
- {colors.primary} 只给主按钮、当前选中与图表主系列；深色主题里它是信号绿，浅色主题里它是墨黑。信号绿只做强调（hero 中的一个词、Live 点、选中 pill），一屏不超过三处。
- {colors.muted-foreground} 承担全部元信息；{colors.border} 只做分隔，不做装饰。
- 状态色不直接写：成功 / 进行中 / 危险 / 中性走 `StatusBadge` 与 `SectionBadge` 的固定色组；`violet` 只给「资本」板块。
- 软标签两套：浅色 `border-<tone>-500/20 bg-<tone>-500/10 text-<tone>-700`；深色 `dark:border-<tone>-400/35 dark:bg-<tone>-400/10 dark:text-<tone>-300`。
- 品牌 chip（最新一期、关注实体）只走 `BRAND_CHIP`（`src/lib/tone.ts`）：`border-signal/30 bg-signal/10 text-signal`，不再用蓝色。
- 读者页正文链接不用 {colors.primary}，用下划线 + {colors.foreground}。
- 深色下边框用低透明度前景色，不另造一套灰。
- 信号绿/墨黑填充上的 kbd、badge、辅助字必须用对应的 `*-foreground`；不能把 `muted` 字放在 `primary` 底上。

## 字体

- 三层字体：展示 `Instrument Serif` + 中文宋体（`.text-display`）、UI `Inter Variable`、数字 `tabular-nums`。
- 页面标题用 `PageHeader` 的 `clamp(2.2rem,4.2vw,3.9rem)`；读者 hero 用 `clamp(2.8rem,6.8vw,6.4rem)`；日报文章标题用 `clamp(2.6rem,5.2vw,4.8rem)`。
- 每日情报卡片：普通卡标题 `1.06rem`、摘要 `text-xs`；头条卡标题用展示衬线 `clamp(1.8rem,3.2vw,2.8rem)`。
- 日报正文 `15px/8`，Markdown 小节标题用展示衬线；首段首字下沉用 `.brief-prose`。
- 元信息统一 `.eyebrow`（10px、0.22em 字距、大写）；数字一律 `tabular-nums`；中英混排保留半角空格。

## 布局与密度

- 壳层：15rem 侧栏 + 右侧悬浮圆角内容面板；内容区独立滚动，路由切换回到顶部。侧栏有 Radar 字标、工作区切换、胶囊导航；底部账户卡保持中性，不要用信号绿铺满。
- 所有页面 `PageContainer` 默认 `max-w-7xl`，1600 视口下标题左边界统一 300px；**禁止单页覆盖 max-w-**。今日 hero 不套带左内边距的卡片，标题、筛选、头条卡共用同一条左基线。
- **每日情报只有卡片视图**：桌面 3 列、平板 2 列、移动 1 列；第一条为全宽头条卡，其余 3 列。卡片高度随内容，但至少容纳来源、标题、摘要、板块与详情。不再提供列表切换。
- hero 下方是玻璃筛选 dock：日期胶囊 + 板块胶囊 + 结果数 + 搜索；URL 带 `date` / `section`，无数据时给清除入口。
- 卡片网格间距 16px；普通卡内边距 20px、圆角 24px，头条卡全宽、内边距 28px；标题最多 2 行、摘要最多 3 行。
- 运营看板：4 个指标卡 + 「板块分布 / 采集参数」两栏 + 一句说明；只放数据，不放任务流水，任务只在 `/runs`。
- 设置页：左侧 208px 分区导航（搜索源 / 运行配置 / 检索参数 / 对话模型 / 日报生成 / 消息推送 / 运行状态；640px 以下只显示图标）+ 右侧内容。搜索源在 1280+ 用 2×2 多选卡片（复选框），以下单列，每张卡内放本地品牌图标、名称、**名称下一行一句话介绍**（这个源是什么、擅长什么，11px 次要色，最多两行）、Key、测试连接；**卡片右上角是状态胶囊**（已开启 / 已保存 / 未配置）与文档链接（640px 以下只留胶囊）；可同时启用多个源并行检索。Key 输入框默认显示前后各 4 位掩码（`sk-d••••••1314`），点眼睛才向服务端取完整值、再点回掩码，清空后保存即删除；群机器人加签密钥复用同一个 `SecretField` 组件。卡底不再放能力标签。运行配置集中自动运行开关、执行时间、运行日、错过补跑、回看窗口、每条检索词、每日情报上限与日报引用上限；日报生成卡片只展示模型与两段提示词，日报由本地 DeepSeek 生成，不接外部工作流；消息推送用 2 列卡片，每张卡左侧 44px 白底圆角放平台 logo（企业微信 / 钉钉 / 飞书），卡内第一行是 Webhook 地址 + 右侧「测试发送」（与搜索源的「测试连接」同一位置），第二行是加签密钥（掩码 + 眼睛，留空表示不修改），右上角同样是状态胶囊（已开启 / 已保存 / 未配置）+ 文档链接；底部说明右侧是「重推今日日报」；检索参数里「搜索语法」用四个窄输入框（限定站点 / 排除站点 / 精确短语 / 排除短语，2 列自适应 1 列），下方给一块等宽字体的「发出的 query 预览」，实时显示拼接后的 `site:` / `-site:` / `"…"` / `lang` / `after`，lang 与 after 只读、由「搜索语言」「时间窗口」推导；检索词用多行文本，字段说明统一收进标签旁 tooltip，提示词用大号 textarea（支持 `{{count}}` / `{{window}}` / `{{date}}` / `{{items}}`），时间/条数用数字输入，语言用分段控件；保存按钮固定在页头右侧，不在表单底部。
- 每日情报：日期/板块筛选同一行最右侧放搜索框，支持来源、标题、副标题与标签；窄屏用同一行内的搜索图标展开；搜索是当前日期/板块内的即时过滤。
- 运行记录：工具栏（状态分段 + 刷新）+ 表格 + 分页在同一张 `Card` 内；桌面 `DataTable`，窄屏 `MobileRow` 降级，失败行就地重试。
- 日报仍是文档式三栏：左侧 180px 目录大纲、中间 1fr 正文、右侧 180px 历史日报（xl）；lg 只保留右侧历史，目录收成正文上方折叠条。
- 日报目录从 Markdown 的 `##` 标题提取，点击平滑定位、滚动高亮；正文 `[n]` 数字标签 hover 来源卡。
- 表格行高 44–56px，首列 `pl-4`、末列 `pr-4`；Card 内表格贴底，分页作为卡片的最后一行。

## 组件

- 壳层：`AppShell` / `AppSidebar` / `AppHeader` / `MobileNav` / `CommandMenu`。
- 页面骨架：`PageContainer` + `PageHeader`；列表用 `DataTable` + `TableToolbar` + `TablePagination`，三者组合在同一张 `Card`。
- 领域件：`DailyCard` / `SourceFavicon` / `SectionBadge` / `StatusBadge` / `IngestButton` / `SettingsForm`（搜索源 / 检索参数 / 对话模型 / 日报生成 / 运行状态五段） / `SettingsNav` / `BriefToc` / `SourceCitation`。
- 壳层工作区切换器：侧栏与移动端共用，切换后写 `intel_workspace` cookie 并 `router.refresh()`；当前项用图标 + 名称 + 领域副标题表达。
- **签名件**：每日情报卡片 `DailyCard`。普通卡是来源 + 日期 + 序号 / 标题 / 摘要 / 板块 + 圆角详情；头条卡全宽，展示衬线大标题和巨大的幽灵序号，是读者页的记忆点。不能退化成纯文本列表。
- **签名件**：运营看板的「指标 + 板块分布 + 采集参数」结构，数字用等宽，状态用 `StatusBadge`。
- 日报正文用 `react-markdown` + `remark-gfm` 原样渲染 AI Markdown，不在渲染层编号；`BriefToc` 负责目录与滚动高亮。
- 写操作统一走 Server Action：设置保存、立即采集、失败重试；按钮必须有 pending / success / error 三态。

## 状态与反馈

- 加载：服务端页面直接给结果；采集按钮在 Server Action 执行期间显示 spinner 并禁用。
- 空：区分「没有数据」与「没有匹配」；筛选为空给清除入口，日报为空给等待说明，检索词为空在设置里给校验错误。
- 错误：采集失败保留 `runs.error`，在运行记录里可重试；表单失败在页头保存按钮旁给具体原因，不用全屏报错。
- 无权限：当前是单租户本地版，没有登录/权限；不伪造「只读」或「管理员」状态。
- 动效：hero 入场、卡片 hover 抬升、筛选切换与采集 pending；时长 200–500ms，`prefers-reduced-motion` 下全部关闭。

## 不要做

- 不恢复每日情报的列表视图，也不做「列表 / 卡片」切换。
- 不在读者页放采集量、成本、流水线或成功率。
- 不为没有后端的能力保留假页面：渠道、预警、独立信息源配置已删除。
- 不在一条情报里并排多个媒体名与时间——只露 `sources[0]`。
- 不把日报写成条目列表——必须是导语 + 主题段落 + 情报洞察 + 来源。
- 不单页覆盖 `PageContainer` 的 `max-w-*`——标题左边界会跳。
- 不展示未落库的「保存成功」或未运行的「运行中」任务。

## 已知缺口

- 数据库是本地 SQLite（WAL），单进程；没有连接池、备份策略与 MySQL 迁移脚本。
- 有进程内定时调度：Next server 的 instrumentation 每 30 秒检查一次，默认 Asia/Shanghai 每天 08:00；不是独立 cron/队列，服务停止时不会执行。
- 没有登录、成员与权限；`/settings` 对所有访问者开放。
- 没有渠道分发、预警、成本计费与对象存储；相关数据模型和页面已移除。
- 没有「主题」层：检索词、时间、条数与模型统一在设置里，采集只跑一份全局配置。
- 读者页采用 C 端 Persuade 风格，与默认企业 Operate 基线有意不同；运营页仍按 Operate 组织。
- 日报质量依赖搜索源返回与模型稳定性；低质量站点仍可能进入结果。
- 移动端只验证 390px 与桌面 1600px 两个宽度；1024–1280 未逐页截图。
- 工作区固定为金融 / AI 两个，不支持新建；选择落在 cookie，不写进 URL，分享链接会沿用接收方自己的工作区。

## 迭代指南

1. 改界面前先读本文件与 `AGENTS.md`，再找同形态页面照结构改。
2. 改 token 只改 `src/app/globals.css`，然后同步 front matter，不手改颜色值。
3. 改数据只动 `src/lib/server/repositories/*`；页面与 Server Action 不直接写 SQL。
4. 改完跑 `pnpm typecheck && pnpm build`，再跑 `node scripts/verify-ui.mjs`。
5. 交付附截图到 `docs/screenshots/`，深色 + 浅色各一组；关键流程留 E3 证据。
6. 新规则先在本项目跑通，再回流 loom。
