# 后端与 SQLite 说明

> 当前版本的目标是**先把完整链路跑通**：设置搜索源与检索词 → 搜索 → 情报 → 日报 → 运行记录 → 页面。
> 数据层用 SQLite（Node 24 内置 `node:sqlite`），迁移 MySQL 时只替换实现，不改页面契约。

## 1. 产品收敛

运营板块从 6 个页面收敛为 2 个 + 设置：

| 保留 | 原因 |
|---|---|
| `/admin` | 真实情报量、累计数据、检索词数、运行成功率、板块分布、当前采集参数 |
| `/runs` | 采集/日报生成的真实流水，失败可重试 |
| `/settings` | 搜索源、检索词、时间、条数、语言、模型、日报引用上限；采集直接读它 |

删除：

| 删除 | 原因 |
|---|---|
| `/topics` | 检索词、时间、条数、模型本身就是采集参数，统一放设置更直接 |
| `/sources` | 搜索源配置已并入 `/settings` 的「搜索源」分区，不再单开一页 |
| `/channels` | 没有企业微信/钉钉/飞书/邮件的真实发送实现 |
| `/alerts` | 没有规则引擎、去重窗口与 IM 推送 |

这样每个留下的运营页面都能回答一个真实问题：**跑了多少、参数是什么、哪里失败了**。

## 2. 数据模型

数据库文件：`.data/intel.sqlite`（可用 `DATABASE_PATH` 覆盖）。WAL 模式，单进程。

| 表 | 作用 | 关键字段 |
|---|---|---|
| `workspaces` | 工作区 | `id`、`name`、`industry`、`description` |
| `items` | 每日情报 | `id`、`workspace_id`、`date`、`section`、`title`、`summary`、`why`、`sources`(JSON)、`importance`、`score` |
| `briefs` | 日报 | `id`、`workspace_id`、`date`、`title`、`summary`、`status`、`items`、`sections`、`report`(JSON)、`published_at` |
| `runs` | 任务流水 | `id`、`workspace_id`、`job`、`target`、`status`、`started_at`、`duration`、`detail`、`date`、`error` |
| `app_settings` | 采集参数（每工作区一份 JSON） | `workspace_id`(PK)、`value`(JSON)、`updated_at` |
| `search_provider_keys` | 搜索源 Key | `workspace_id`、`provider_id`、`api_key`、`updated_at`，主键 `(workspace_id, provider_id)` |
| `webhook_endpoints` | 群机器人配置（每工作区每平台一行） | `workspace_id`、`provider`(wecom/dingtalk/feishu)、`url`、`secret`、`enabled`、`updated_at`，主键 `(workspace_id, provider)` |
| `scheduled_runs` | 定时运行抢占与结果 | `workspace_id`、`date`、`schedule_time`、`status`、`started_at`、`finished_at`、`error`，主键 `(workspace_id, date, schedule_time)` |
| `meta` | 迁移标记 | `seed_version`、`schema_version`、`legacy_live_imported` |

`app_settings.value` 每个工作区一份，形状：

```json
{
  "searchProviders": ["deepseek"],
  "chatModel": "deepseek-flash",
  "queries": ["央行 货币政策 流动性 金融监管 最新消息"],
  "searchLang": "zh",
  "searchCount": 10,
  "itemLimit": 80,
  "lookbackDays": 1,
  "briefItemLimit": 60,
  "scheduleEnabled": true,
  "scheduleTime": "08:00",
  "scheduleDays": [1, 2, 3, 4, 5, 6, 7],
  "scheduleCatchUp": false,
  "deepseekSyntax": {
    "includeSites": "",
    "excludeSites": "",
    "exactPhrase": "",
    "excludePhrase": ""
  },
  "briefSystemPrompt": "你是资深金融日报主编。只输出 JSON，不要解释。…",
  "briefUserPrompt": "日期：{{date}}…基于下面的 {{count}} 条{{window}}…情报：\n{{items}}"
}
```

搜索源 Key 单独落在 `search_provider_keys` 的 `(workspace_id, provider_id)` 行，`api_key`
为明文；页面只读取掩码后的前后几位（`getProviderStates`），用户点眼睛时才通过
`revealProviderKeyAction` 取完整 Key。输入框清空并保存会删除已保存的 Key；
环境变量不随页面清空而移除。
没有保存 Key 时回退 `DEEPSEEK_API_KEY` / `BOCHA_API_KEY` / `METASO_API_KEY` / `TAVILY_API_KEY`。

对话与分类只用 DeepSeek 原生接口（`src/lib/server/deepseek.ts`），不接外部工作流或知识库；
对话 Key 优先读设置页里 DeepSeek 搜索源保存的值，其次回退 `DEEPSEEK_API_KEY`。

索引：`items(workspace_id, date)`、`briefs(workspace_id, date)`、`runs(workspace_id, created_at)`。

删除策略：当前是本地单租户演示，**物理删除**；重新采集同一天会整日替换 `items`，
并替换当天非周报 `briefs`，旧 `runs` 保留用于对照。

## 3. 一次采集

入口：

- 页面：`IngestButton` → `triggerIngestAction`（Server Action）
- 外部：`POST /api/intel/ingest?date=YYYY-MM-DD`（可加 `x-ingest-token`）
- 定时：Next instrumentation 启动 `src/lib/server/scheduler.ts`，每 30 秒按 Asia/Shanghai 检查一次；
  默认每天 08:00，配置在 `/settings` 的「运行配置」。`scheduled_runs` 主键保证同一天同一时间只跑一次；
  服务停止时不会执行，开启「错过补跑」后启动当天会补一次。

流程（`src/lib/server/ingest.ts`）：

1. 读当前工作区的 `app_settings` 与 `search_provider_keys`；没有检索词或当前搜索源没有 Key 直接报错。
   每日情报条数用 `itemLimit`（30–120），日报引用条数用 `briefItemLimit`（20–80），两者已解耦；分类按 40 条/块分块调用，避免单次 JSON 输出被截断。
2. 按 `searchProviders` 并行选适配器：DeepSeek 用 `buildDeepSeekQuery()` 拼
   `<检索词> site:… -site:… "精确短语" -"排除短语" lang:<searchLang> after:<date-lookbackDays>`
   （站点与短语来自设置页「搜索语法」，与预览共用同一份实现，见 `src/lib/deepseek-query.ts`）；
   博查用 `freshness`，秘塔用 `scope/size`，Tavily 用 `time_range` 与 `max_results`；
   未配置 Key 的启用源会被跳过，结果按 URL + 标题去重合并。
3. 按 URL + 标题去重，按 `rerank_score` 截断 shortlist；四条适配器都归一成同一个 `SearchResult`。
4. 对话模型分类/摘要（关闭 thinking，失败则回退规则分类），按标题 bigram 去重；
   对话 Key 优先读 DeepSeek 搜索源保存的 Key，其次回退 `DEEPSEEK_API_KEY`。
5. 按 `workspace_id + date` 整日替换 `items`。
6. 用设置里的 `briefSystemPrompt` / `briefUserPrompt` 生成日报 Markdown；占位符
   `{{count}}` / `{{window}}` / `{{date}}` / `{{items}}` 在服务端替换；失败则用结构化回退稿。写 `briefs`。
7. 采集、日报生成各写一条带 `workspace_id` 的 `runs`；任一步失败写 `失败` + `error`，不吞异常。
8. 日报只有一个后端：本地 DeepSeek（`deepseekJSON`）。模型失败时回退结构化稿，
   `runs.detail` 记录「模型名 / 结构化回退」，日报状态仍是已发布。

实测（2026-10-29）：
- 金融工作区：6 条检索词 → 26 条情报、4 节日报「政策托底与结构分化」，约 22.9s；
- AI 工作区（`?workspace=ai`）：6 条 AI 检索词 → 58 条结果 → 26 条情报、
  4 节日报「AI监管落地与开源竞速」，24.1s；两个工作区的 items/briefs/runs 完全隔离。
- 日报小标题由提示词生成 `1.` / `2.` 编号；渲染层 `numberSectionHeadings` 兜底旧
  `01` 格式，导语 / 情报洞察 / 来源不编号。
- 日报覆盖范围由 `src/lib/brief-coverage.ts` 从当期引用的新闻发布时间计算；
  `report.coverage` 不再展示。

> `deepseek-flash` 默认开启 thinking；结构化 JSON 请求显式传
> `thinking: { type: "disabled" }`，否则 reasoning token 会吃满 `max_tokens`，`content` 为空。

## 4. 接口与校验

Server Actions：

| Action | 入参 | 出参 |
|---|---|---|
| `triggerIngestAction(date?)` | 可选 `YYYY-MM-DD`；工作区来自当前 cookie | `{ ok, workspace, date, items, briefTitle, totalMs }` 或 `{ ok:false, error }` |
| `saveSettingsAction(prev, formData)` | 当前工作区的搜索源/检索词/语言/时间/条数/模型/日报上限/system prompt/user prompt；`providerKey_*` 提交掩码视为未改、提交空值删除已保存 Key、提交新值覆盖 | `{ ok, savedAt, savedToken }` 或 `{ ok:false, error }` |
| `revealProviderKeyAction(providerId)` | 用户点眼睛时按需读取单个搜索源的完整 Key | `{ ok, apiKey? }` 或 `{ ok:false, error }` |
| `testSearchProviderAction({ providerId, apiKey? })` | 搜索源 ID 与可选临时 Key；只读 3 条结果 | `{ ok, message }` |

Route Handlers：

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | 返回 SQLite 是否可读、当前工作区与 items/briefs 数量 |
| `POST` | `/api/intel/ingest` | 触发一次采集；`?workspace=finance\|ai` 可显式指定，否则读 cookie；`INGEST_TOKEN` 可选 |
| `GET` | `/api/intel/ingest` | 返回调用提示与 token 状态 |

所有写操作都用 Zod（`zod@4`）校验；`briefUserPrompt` 必须包含 `{{items}}`；错误以
`{ ok:false, error }` 返回，不把 SQL 异常直接抛给页面。`runIngest` 内部仍会抛出给 API/Server Action 记录失败。

## 5. seed 与旧数据迁移

- 空库首次访问会自动建表并 seed：`src/lib/intel.ts` 的样例情报、日报、运行记录，
  以及 `src/lib/settings.ts` 的默认检索词与 `deepseek-flash`。
- 若存在旧版 `.data/live/*.json`，首次启动会导入并替换同日样例；标记写进 `meta`。
- v1 老库由 `db/migrate.ts` 升级到 v15：
  - 删除 `topics` 表、`items.topic_id` 与相关索引；
  - 设置升级为 `deepseek-flash` + 6 条金融检索词 + `searchLang`；
  - 补上 `briefSystemPrompt` / `briefUserPrompt`，旧库缺少提示词时自动填默认值；
  - 旧主题式 `runs.target` 归并为「金融情报采集」，清理旧的跳过记录；
  - 新增 `workspaces` 表与 `items/briefs/runs.workspace_id`，已有数据全部归 `finance`；
  - `settings` 的旧 `app` 键迁移为 `app:finance`，并写入 `app:ai` 的 AI 默认检索词与提示词；
  - v8 把旧 `settings` 的 `app:*` 行复制到 `app_settings`、`provider:*` 行复制到
    `search_provider_keys`，然后删除旧表；已有 Key 不会丢；
  - v9 把单源 `searchProvider` 升级为多选 `searchProviders` 数组；
  - v10 把板块改为跨行业分类（政策与监管 / 市场与趋势 / 公司与产品 / 资本与交易 / 观点与研究 / 风险与异动），并把每日情报/日报引用上限提升到 80/60；
  - v11 加入定时运行配置（默认每天 08:00）与 `scheduled_runs` 抢占表；
    - v14 移除 FastGPT：删除 `fastgpt_credentials` / `fastgpt_brief_credentials` 两张凭据表、
    清掉 `app_settings` 里的 `fastgpt*` 字段与 `briefProvider`、删除历史「FastGPT 同步」运行记录；
  - v15 新增 `webhook_endpoints`，存放企业微信 / 钉钉 / 飞书群机器人的地址、加签密钥与启用状态。
  - v5–v7 把日报提示词升级为 `1.` / `2.` 主题编号，补充事实约束，并把末节「判断」改为「情报洞察」。
- 重置：停服务后删除 `.data/intel.sqlite*`，下次访问重新 seed。
- 数据库与旧 JSON 都在 `.data/`，已被 `.gitignore` 忽略。

## 5.1 生产运行约束

- **鉴权**：`/login` 口令登录 + httpOnly 会话 cookie，`src/proxy.ts` 校验页面、Server Action 与 API；
  未设置 `APP_AUTH_PASSWORD` 时开发放行、生产除 `/api/health` 外 503。
  采集接口可凭 `x-ingest-token` 免口令，比较用定长摘要。
- **连接**：`PRAGMA journal_mode=WAL` + `busy_timeout=5000`；迁移前自动备份
  `<库文件>.v<旧版本>.bak`（最多 3 份，`DB_BACKUP_DISABLED=1` 关闭）。
- **采集互斥**：同一进程只允许一轮 `runIngest`（SQLite 单连接 + 整日替换事务），
  撞车时 Server Action 报错、`/api/intel/ingest` 返回 409。
- **时间预算**：搜索并发默认 8、单请求最多 45s、整轮默认 240s（`INGEST_TIMEOUT_MS`）；
  超时按「搜索 / 分类 / 日报生成」阶段中止，并在 `runs` 里留一条失败记录。
- **模型重试**：`deepseekJSON` 对 429 / 5xx / 超时 / 空 content / 非 JSON 重试一次；
  每次成功调用写一条 `ai.call` 日志（模型、耗时、token）。
- **调度回收**：`scheduled_runs` 中超过 3 小时仍是 `running` 的记录会被判定为进程中断并回收，
  否则进程被杀后当天再也补不上。

## 6. 迁移 MySQL 的计划

当前仓储接口已经是 `async`，页面不直接持有连接。迁移步骤：

1. 新增 `src/lib/server/db/mysql-client.ts`，用 `mysql2/promise` 连接池；
   环境变量从 `DATABASE_PATH` 切到 `DATABASE_URL`。
2. 逐表替换 `repositories/*` 的 SQL：
   - `TEXT` 存 JSON → MySQL `JSON` 类型；读写仍 `JSON.stringify/parse`。
   - `ON CONFLICT(...) DO UPDATE` → `ON DUPLICATE KEY UPDATE`。
   - `INTEGER` 布尔 → `TINYINT(1)`。
   - `date` 字符串保留 `CHAR(10)` 或 `DATE`；比较语义一致。
3. 迁移 `schema.ts` 为 `prisma/schema.prisma` 或 SQL migration；推荐 Prisma 7.5 + MySQL adapter，
   但**不要**让页面直接 import Prisma Client，仍保留 repository 边界。
4. 把 `runIngest` 从请求链路移到 BullMQ Worker；页面只创建任务并轮询 `runs`。
5. 加 `tenant_id` / `created_by` / `updated_by` 与软删除；当前单租户版本没有这些字段。
6. 上线前补：迁移 rehearsal、索引核对、慢查询、并发采集幂等键（`date + job`）。

## 7. 已知限制

- 单进程 SQLite，避免多实例同时写；WAL 不是并发写方案。
- 采集在请求链路内同步执行（15–25 秒），没有队列、重试退避与取消。
- 没有登录/权限/审计；`/settings` 对所有访问者开放，工作区切换仅靠 cookie，不做权限校验。
- 工作区固定为 finance / ai 两个，不支持在界面新建；新增工作区需要改 `src/lib/workspaces.ts` 并补 migration/seed。
- 没有成本计费；`runs` 只记录条数与耗时，不记录 token 与金额。
- 日报与分类质量依赖搜索源与模型；搜索结果中的低质量站点仍可能进入。
- 搜索源 Key 以明文 JSON 存在本地 SQLite（本地单租户版）；上生产前应改为加密存储并补审计。
