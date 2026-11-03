# DeepSeek Search API：请求与响应

> 本文只记录 **Search**（网页搜索）接口。实际调用时间：2026-10-28，响应为真实返回，`summary` / `content` 为便于阅读做了截断并标了 `…`。
> 官方文档：[Search / Fetch 指南](https://api-docs.deepseek.com/zh-cn/guides/search/) · [Search API Reference](https://api-docs.deepseek.com/zh-cn/api/search/)

## 1. 端点与鉴权

| 项 | 值 |
|---|---|
| Base URL | `https://api.deepseek.com` |
| Endpoint | `POST /v1/tools/search` |
| 鉴权 | `Authorization: Bearer <DEEPSEEK_API_KEY>` |
| Content-Type | `application/json` |
| 计费 | 每 1,000 次**成功且有结果**的请求 5 元 |
| 限速 | 100 QPS（账号级，与 key 无关） |

```bash
export DEEPSEEK_API_KEY="sk-..."
```

## 2. 最小 curl

```bash
curl -sS https://api.deepseek.com/v1/tools/search \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "央行 公开市场操作 流动性 after:2026-10-27 lang:zh",
    "count": 3,
    "need_content": false
  }' \
  -w '\nHTTP %{http_code}\n'
```

只想看关键字段：

```bash
curl -s https://api.deepseek.com/v1/tools/search \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"央行 公开市场操作 流动性 after:2026-10-27 lang:zh","count":3}' \
| jq '.results[] | {title, site_name, date, authority, rerank_score}'
```

## 3. 请求字段

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `query` | string | 是 | — | 搜索词，1–128 个 Unicode 字符，不能全为空白；支持搜索语法 |
| `count` | integer | 否 | `10` | 返回条数，1–50；不影响计费 |
| `ori_question` | string | 否 | — | 触发搜索的原始问题，1–128 字符，帮助理解意图 |
| `localization` | string | 否 | `""` | 优先返回本地结果所用的 IP 地址 |
| `need_content` | boolean | 否 | `false` | 是否在 `content` 返回网页正文；`false` 时恒为空字符串 |

未知字段会被忽略。

带原始问题的请求：

```json
{
  "query": "央行 公开市场操作 流动性 after:2026-10-27 lang:zh",
  "ori_question": "今天央行有没有新的流动性投放？",
  "count": 5
}
```

### query 怎么读

`query` 是一个字符串，里面可以同时放**关键词**和**操作符**，没有单独的 `keywords` 字段：

```text
央行 债市 BNSF 流动性工具 after:2026-10-27 lang:zh
└──────── 关键词 ────────┘ └──── 操作符 ────┘
```

| 片段 | 类型 | 作用 |
|---|---|---|
| `央行` `债市` `BNSF` `流动性工具` | 关键词 | 空格分隔，搜索引擎按相关性召回；**不保证每个词都出现** |
| `after:2026-10-27` | 操作符 | 只要发布时间晚于该日期的网页 |
| `lang:zh` | 操作符 | 只要中文网页 |

几个等价/对比写法：

```text
# 纯关键词：召回范围最大
央行 债市 BNSF 流动性工具

# 要求“流动性工具”作为精确短语出现
央行 债市 BNSF "流动性工具"

# 限定站点 + 排除微博 + 只要 10-27 之后
央行 债市 BNSF site:gov.cn -site:weibo.com after:2026-10-27 lang:zh
```

注意：

- 空格不是严格的布尔 AND；太长的关键词串会同时收紧召回和排序，建议 3–5 个核心词。
- `after:` / `before:` 的日期边界由搜索服务按网页发布时间判断，不保证和你的时区完全一致。
- `OR` 要大写，操作符和值之间不要加空格（`after:2026-10-27`，不是 `after: 2026-10-27`）。
- `count`、`need_content` 是 JSON 字段，不属于 `query`。

### 搜索语法

| 语法 | 示例 | 说明 |
|---|---|---|
| `site:` | `央行 site:gov.cn` | 限定站点，多个用空格 + `OR` |
| `-site:` | `金融 -site:example.com` | 排除站点 |
| `-` | `金融 -广告` | 排除关键词 |
| `-"..."` | `金融 -"release notes"` | 排除短语 |
| `"..."` | `金融 "精确短语"` | 精确匹配 |
| `lang:` | `lang:zh,en` | 限定语言 |
| `after:` | `after:2026-10-27` | 发布时间晚于该日期 |
| `before:` | `before:2026-10-28` | 发布时间早于该日期 |

组合示例：

```json
{
  "query": "央行 流动性 site:gov.cn OR site:cnfin.com lang:zh after:2026-10-27",
  "count": 10
}
```

## 4. 真实响应（need_content=false）

HTTP 200：

```json
{
  "results": [
    {
      "title": "“削峰填谷”精准调节 10月MLF缩量续作",
      "site_name": "jingjiribao.cn",
      "site_icon": "https://cdn.deepseek.com/site-icons/jingjiribao.cn",
      "authority": 4,
      "rerank_score": 2.45,
      "date": "2026-10-26T16:00:00+00:00",
      "url": "http://rss.jingjiribao.cn/static/detail.jsp?id=692993",
      "summary": "# “削峰填谷”精准调节 10月MLF缩量续作 2026-10-27 14:17:42 10月26日，中国人民银行开展7000亿元1年期中期借贷便利（MLF）操作。由于当月MLF到期量为9000亿元，因此，实现净回笼2000亿元……（此处截断）",
      "snippet": "10月26日，中国人民银行开展7000亿元1年期中期借贷便利（MLF）操作 ... 与此同时，受各类因素影响，当前市场流动性偏宽松 ... “当前及未来一段时间央行将主要通过买断式逆回购、MLF等在内的中期流动性工具加量续作，适度加大逆周期调节力度。",
      "content": ""
    }
  ]
}
```

> 这是官方文档之外的实际观察：`summary` 不一定是 600–800 字，可能直接是一整篇正文；真正需要控制上下文时，用 `snippet` 或截断 `summary`。

### 响应特点

- 没有 `offset` / `cursor` 分页；一次最多 50 条，翻页只能换 query 或多次调用。
- 没有显式排序参数；结果通常按内部相关性/`rerank_score` 排列，但不要假设严格有序。
- 没有结果时返回 `{"results":[]}`，仍是 HTTP 200。
- 响应只包含 `results` 一个顶层字段（错误时是 `error`）。

## 5. 字段说明

| 字段 | 类型 | 可能为 null | 说明 |
|---|---|---|---|
| `results` | array | 否 | 成功时为数组；无结果时是空数组（仍是 200） |
| `results[].title` | string | 否 | 标题 |
| `results[].url` | string | 否 | 原文链接 |
| `results[].snippet` | string | 否 | 与 query 相关的短摘要，约 100–200 字，适合前端展示 |
| `results[].summary` | string | 否 | 长摘要，官方称约 600–800 字；实测可能包含整篇正文 |
| `results[].content` | string | 否 | 网页正文（Markdown/纯文本）；`need_content=false` 时为 `""` |
| `results[].site_name` | string \| null | 是 | 站点名；实测可能是中文名（`证券时报`），也可能只是域名（`jingjiribao.cn`） |
| `results[].site_icon` | string \| null | 是 | 站点图标 URL，一般在 `cdn.deepseek.com/site-icons/...` |
| `results[].date` | string \| null | 是 | 发布时间，UTC RFC 3339；实测常见 `T16:00:00+00:00`（即北京时间次日 00:00） |
| `results[].authority` | integer | 否 | 权威性 0–4；`-1` 表示未知；`>=3` 为极权威 |
| `results[].rerank_score` | number | 否 | 相关性/权威性/时效性综合分，0–3；`>=1.5` 为优质结果 |

### date 的时区注意

`2026-10-26T16:00:00+00:00` 转成北京时间是 **2026-10-27 00:00**。很多站点只提供日期，所以时间部分经常是 00:00；展示时更适合取“日期”，不要显示 `00:00`。

## 6. need_content=true 的差异

请求：

```bash
curl https://api.deepseek.com/v1/tools/search \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"央行 债市 BNSF 流动性工具 after:2026-10-27 lang:zh","count":1,"need_content":true}'
```

响应（截断）：

```json
{
  "results": [
    {
      "title": "央行设立债市非银大额赎回互换便利 应急支持与审慎约束相结合",
      "site_name": "证券时报",
      "date": "2026-10-26T16:00:00+00:00",
      "content": "央行设立债市非银大额赎回互换便利 应急支持与审慎约束相结合 来源：中国证券报作者：彭扬2026-10-27 07:32 …… 中国人民银行10月26日发布公告称，决定设立债市非银大额赎回互换便利（Bond Market NBFI Swap Facility，简称BNSF）。……（此处截断）"
    }
  ]
}
```

本次 `content` 长度 2,653 字，`summary` 1,523 字。`need_content=true` 会增加响应体积和后续 token 成本；本项目默认用 `false`，需要正文时再单独 Fetch。

## 7. 错误响应

真实 400（`count` 越界）：

```json
{
  "error": {
    "message": "'count' must be between 1 and 50 (request_id: 2fc32de4-1cbf-4362-84ca-4eafe82e7a7f)",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_request_error"
  }
}
```

| HTTP | 含义 | 是否重试 |
|---|---|---|
| 400 | 请求头/体不合法（JSON 错误、字段越界） | 否，改请求 |
| 401 | Key 缺失或无效 | 否，换 key |
| 402 | 余额不足 | 否，充值 |
| 408 | 读取请求体超时 | 是 |
| 413 | 请求体过大 | 否，减小请求 |
| 429 | 超过 QPS | 是，退避后重试 |
| 500 | 服务端错误 | 是 |
| 504 | 下游超时 | 是 |

## 8. 计费与限速

- Search：**5 元 / 1,000 次成功请求**；只有 HTTP 200 且 `results` 非空才计费。
- `count` 只影响返回条数，不影响价格。
- QPS：Search 100 / Fetch 25，账号级共享，与 key 无关。
- 失败、空结果、超时不计费。

## 9. 在本项目里的映射

| API 字段 | 项目字段 | 说明 |
|---|---|---|
| `title` | `IntelItem.title` | 清洗站点后缀后作为标题 |
| `summary` / `snippet` | `IntelItem.summary` | 交给模型压缩成一句事实摘要 |
| `url` | `sources[0].url` | 「查看详情」跳原文 |
| `site_name` | `sources[0].site` | 为空时回退 URL hostname |
| `site_icon` | `sources[0].icon` | 来源头像；加载失败回退首字 |
| `date` | `IntelItem.publishedAt` / 日期标签 | 转 Asia/Shanghai；只有日期时显示 `MM-DD` |
| `authority` + `rerank_score` | `verification` / `score` | `authority>=3 && rerank>=1.5` → 已核实；分数映射 35–99 |
| `rerank_score` | 排序 | 先按分数排序，再做 AI 分类 |

相关代码：

- `src/lib/server/deepseek.ts`：Search 封装
- `src/lib/server/ingest.ts`：抓取、去重、分类、写日报
- `src/lib/server/repositories/*`：情报、日报与运行记录写 SQLite
- `src/lib/server/db/seed.ts`：首次启动把旧 `.data/live/*.json` 导入 SQLite

## 10. 踩坑记录

1. **`summary` 可能很长**：不要直接把 10 条结果原样塞进模型，先截断到 200–300 字，或用 `snippet`。
2. **`site_name` 可能是域名**：中文名和域名混用，展示前最好统一回退到 hostname 或人工映射。
3. **`date` 是 UTC**：只给日期的站点会变成 `16:00:00+00:00`，前端显示日期即可。
4. **同一事件多家转载**：按 URL 去重还不够，标题也要做相似度去重（本项目用 2-gram Jaccard ≥ 0.6）。
5. **`results: []` 是正常 200**：不要当失败；本项目会把空结果记为采集失败并写 `runs.error`，不会静默生成空日报。
6. **`content` 默认是空串**：需要正文时必须显式 `need_content: true`，或改用 Fetch。
