# Sealos 部署说明

## 1. 镜像

```text
镜像：crpi-xxxxxxxxxxxxxxxx.cn-hangzhou.personal.cr.aliyuncs.com/<命名空间>/intel-radar:0.1.4
latest：crpi-xxxxxxxxxxxxxxxx.cn-hangzhou.personal.cr.aliyuncs.com/<命名空间>/intel-radar:latest
架构：linux/amd64
大小：约 276 MB
digest：sha256:…（`docker buildx imagetools inspect` 可查）
```

ACR 用户名：`<阿里云账号 ID>`

## 2. 必须挂载数据卷

SQLite、工作区设置、搜索源 Key 都在：

```text
/app/.data/intel.sqlite
```

容器内路径：

```text
/app/.data
```

Sealos / Kubernetes 必须挂 PVC 到 `/app/.data`，否则重建 Pod 后数据会丢。

```yaml
containers:
  - name: intel-radar
    image: crpi-xxxxxxxxxxxxxxxx.cn-hangzhou.personal.cr.aliyuncs.com/<命名空间>/intel-radar:0.1.4
    ports:
      - containerPort: 3000
    env:
      - name: DATABASE_PATH
        value: /app/.data/intel.sqlite
      - name: DEEPSEEK_API_KEY
        valueFrom:
          secretKeyRef:
            name: intel-radar-secrets
            key: DEEPSEEK_API_KEY
      - name: APP_AUTH_PASSWORD
        valueFrom:
          secretKeyRef:
            name: intel-radar-secrets
            key: APP_AUTH_PASSWORD
      - name: INGEST_TOKEN
        valueFrom:
          secretKeyRef:
            name: intel-radar-secrets
            key: INGEST_TOKEN
            optional: true
    volumeMounts:
      - name: data
        mountPath: /app/.data
volumes:
  - name: data
    persistentVolumeClaim:
      claimName: intel-radar-data
```

## 3. 单副本 + Recreate

这是**单进程 SQLite + 进程内调度器**，不能水平扩容：

```yaml
replicas: 1
strategy:
  type: Recreate
```

不要用 RollingUpdate 同时起两个 Pod 共享同一个 SQLite 文件；也不要让两个副本各自跑 08:00 调度。

## 4. 卷权限

镜像以 root 启动 entrypoint：

1. `mkdir -p /app/.data`
2. `chown -R nextjs:nodejs /app/.data`
3. `gosu nextjs node server.js`

所以普通 PVC 即使初始是 root 所有，也能被修正。若平台强制 `runAsNonRoot`（跳过 entrypoint 的 chown），需要给 Pod 配：

```yaml
securityContext:
  fsGroup: 1001
```

或者加一个 initContainer 执行 `chown -R 1001:1001 /app/.data`。

## 5. 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_PATH` | 是 | `/app/.data/intel.sqlite` |
| `APP_AUTH_PASSWORD` | **是** | 全站访问口令；不设置时生产环境除 `/api/health` 外一律 503 |
| `DEEPSEEK_API_KEY` | 建议 | 分类与日报的对话 Key；也可在设置页为 DeepSeek 搜索源保存 |
| `INGEST_TOKEN` | 可选 | 采集 API 的令牌；设置后脚本可用 `x-ingest-token` 免登录调用 |
| `INGEST_TIMEOUT_MS` | 否 | 整轮采集预算，默认 240000 |
| `INGEST_SEARCH_CONCURRENCY` | 否 | 搜索并发上限，默认 8 |
| `DB_BACKUP_DISABLED` | 否 | 迁移前不写备份（默认会留 `.v<旧版本>.bak`，最多 3 份） |
| `APP_BASE_URL` | 建议 | 站内链接前缀，例如 `https://intel.example.com`；群机器人消息里的「查看日报」按钮用它 |
| `PORT` | 否 | 默认 `3000` |

日报完全由本地 DeepSeek 生成：采集写 `items` 后，`runIngest` 用设置页的模型、Key 与两段提示词
直接调 `https://api.deepseek.com/chat/completions`，不依赖任何外部工作流或知识库。
`DEEPSEEK_API_KEY` 建议用 Secret 管理。

### 访问控制

- 设置 `APP_AUTH_PASSWORD` 后，首次访问会跳到 `/login`，输入口令后签发 7 天会话；页面、Server Action 与 API 全部需要登录。
- **没配口令时生产环境直接拒绝**（503，正文会提示该设哪个变量），防止刚部署就裸奔；
  `/api/health` 例外，供容器 HEALTHCHECK 与 Sealos 探针使用。
- 定时脚本调用采集：优先用 `INGEST_TOKEN` + `x-ingest-token`，不要往脚本里塞浏览器口令。
- 口令比较是定长的（SHA-256 摘要逐字节比较）；同一 IP 10 分钟内失败 6 次会冷却，避免被批量尝试。

### 群机器人（消息推送）

设置页的「消息推送」可以同时接企业微信、钉钉、飞书群机器人，采集成功并生成日报后推送当天摘要。

- 需要 Pod 能出网访问 `qyapi.weixin.qq.com`、`oapi.dingtalk.com`、`open.feishu.cn`；
  若集群有出网白名单，请把这三个域名加进去。
- 钉钉「加签」、飞书「签名校验」的密钥保存在 `webhook_endpoints`，页面只显示「已保存」；
  签名算法按官方文档实现（钉钉 timestamp 毫秒 + HMAC；飞书 timestamp 秒 + HMAC 放请求体）。
- 推送失败只写 `webhook.failed` 日志，不影响已经落库的情报和日报，也不会让采集失败。
- 先用每条卡片上的「测试发送」验证，再等定时任务。

### 采集的时间预算

一次采集 = 6 条检索词 × N 个搜索源 + 分类 + 日报，串起来很容易超过网关的 60s。现在的约束：

- 搜索并发上限默认 8（24 个请求分 3 批），单个请求最多 45s；
- 整轮预算默认 240s，超时会在「搜索 / 分类 / 日报生成」阶段中止，并把失败写进 `runs`；
- 同一进程同一时间只允许一轮采集，撞车时 API 返回 **409**、页面提示「已有采集在运行」。

`/api/intel/ingest` 已声明 `maxDuration = 300`。如果放在 Vercel 这类有函数超时的平台，
请确认套餐上限 ≥ 300s；Sealos 自建网关一般不受此限。

## 6. 首次启动与数据

首次启动会创建空库、seed 两个工作区与样例数据。当前本地 `.data/intel.sqlite` 不会打进镜像。

如果要迁移本地数据：

1. 停掉本地 dev server。
2. 执行 `sqlite3 .data/intel.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"`。
3. 把 `intel.sqlite` 复制到 PVC 的 `/app/.data/intel.sqlite`。
4. 不要同时复制旧的 `-wal` / `-shm` 文件，除非做的是停机冷拷贝。

更简单的做法：生产空库启动后，在设置页重新填 Key，然后手动跑一次采集。

### 升级时的自动备份

镜像版本升级可能带动 schema 迁移（当前 v14）。启动时如果检测到旧版本，会先把 WAL 落盘，
再把库文件复制成 `/app/.data/intel.sqlite.v<旧版本>.bak`，最多保留 3 份，日志里记一条
`db.backup`；迁移失败时可直接用它回滚。磁盘紧张或外部已做备份时，设 `DB_BACKUP_DISABLED=1` 关闭。

## 7. 健康检查

```http
GET /api/health
```

返回 `{ ok, database, schemaVersion, workspace, items, briefs, auth, uptimeSec }`，
不需要鉴权；`ok:false` 或非 200 即视为不健康。

镜像自带 Docker HEALTHCHECK，Sealos 可再配：

```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
```

## 8. 本地验证镜像

```bash
docker run --rm -p 4399:3000 \
  --platform linux/amd64 \
  -v intel-radar-data:/app/.data \
  -e DEEPSEEK_API_KEY=<your-key> \
  -e DATABASE_PATH=/app/.data/intel.sqlite \
  crpi-xxxxxxxxxxxxxxxx.cn-hangzhou.personal.cr.aliyuncs.com/<命名空间>/intel-radar:0.1.4
```

```bash
curl http://127.0.0.1:4399/api/health
```

## 9. 已实测

- `linux/amd64` 镜像构建成功
- 容器内 `node:sqlite`、Next standalone、`/api/health` 正常
- 挂载卷后 SQLite 正常创建，`/settings` 200
- 设置页保存搜索源 Key 后重启容器，Key 仍在（落在卷里的 SQLite）
