import "server-only"

import type { DatabaseSync } from "node:sqlite"

import type { WorkspaceId } from "@/lib/workspaces"
import { maskSecret } from "@/lib/mask"
import {
  WEBHOOK_PROVIDER_IDS,
  type WebhookEndpointState,
  type WebhookProviderId,
  isWebhookProviderId,
} from "@/lib/webhooks"
import { getDb } from "@/lib/server/db/client"

export type WebhookEndpoint = {
  provider: WebhookProviderId
  url: string
  secret: string
  enabled: boolean
}

type WebhookRow = {
  provider: string
  url: string
  secret: string
  enabled: number
  updated_at: string
}

/** 服务端内部用：带密钥原文，只在发送时读取。 */
export function getWebhookEndpoint(
  workspaceId: WorkspaceId,
  provider: WebhookProviderId
): WebhookEndpoint | null {
  const row = getDb()
    .prepare(
      `SELECT provider, url, secret, enabled, updated_at
       FROM webhook_endpoints WHERE workspace_id = ? AND provider = ?`
    )
    .get(workspaceId, provider) as WebhookRow | undefined
  if (!row) return null
  return {
    provider,
    url: row.url,
    secret: row.secret,
    enabled: row.enabled === 1,
  }
}

/** 采集结束时批量取：只要已启用且有地址的。 */
export function listEnabledWebhookEndpoints(
  workspaceId: WorkspaceId
): WebhookEndpoint[] {
  const rows = getDb()
    .prepare(
      `SELECT provider, url, secret, enabled, updated_at
       FROM webhook_endpoints
       WHERE workspace_id = ? AND enabled = 1 AND url <> ''`
    )
    .all(workspaceId) as unknown as WebhookRow[]
  return rows
    .filter((row) => isWebhookProviderId(row.provider))
    .map((row) => ({
      provider: row.provider as WebhookProviderId,
      url: row.url,
      secret: row.secret,
      enabled: true,
    }))
}

/** 设置页用：只下发「是否配置了密钥」，不返回密钥。 */
export function getWebhookStates(workspaceId: WorkspaceId): WebhookEndpointState[] {
  const rows = getDb()
    .prepare(
      `SELECT provider, url, secret, enabled, updated_at
       FROM webhook_endpoints WHERE workspace_id = ?`
    )
    .all(workspaceId) as unknown as WebhookRow[]

  return WEBHOOK_PROVIDER_IDS.map((provider) => {
    const row = rows.find((item) => item.provider === provider)
    return {
      provider,
      url: row?.url ?? "",
      enabled: row?.enabled === 1,
      secretConfigured: Boolean(row?.secret?.trim()),
      // 只下发掩码，完整密钥必须走 reveal action。
      secretPreview: row?.secret?.trim() ? maskSecret(row.secret) : null,
      updatedAt: row?.updated_at ?? null,
    }
  })
}

export type WebhookSaveInput = {
  provider: WebhookProviderId
  url: string
  /** null 表示「保持原密钥」；'' 表示清空。 */
  secret: string | null
  enabled: boolean
}

function deleteEndpoint(db: DatabaseSync, workspaceId: WorkspaceId, provider: string): void {
  db.prepare(
    "DELETE FROM webhook_endpoints WHERE workspace_id = ? AND provider = ?"
  ).run(workspaceId, provider)
}

/**
 * 保存三个平台的配置。
 * 地址清空 = 删除这条配置（连带密钥），避免页面上留着半截数据。
 */
export function saveWebhookEndpoints(
  workspaceId: WorkspaceId,
  inputs: WebhookSaveInput[]
): void {
  const db = getDb()
  const upsert = db.prepare(
    `INSERT INTO webhook_endpoints (workspace_id, provider, url, secret, enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, provider) DO UPDATE SET
       url = excluded.url,
       secret = excluded.secret,
       enabled = excluded.enabled,
       updated_at = excluded.updated_at`
  )

  db.exec("BEGIN")
  try {
    for (const input of inputs) {
      if (!input.url) {
        deleteEndpoint(db, workspaceId, input.provider)
        continue
      }
      const existing = getWebhookEndpoint(workspaceId, input.provider)
      const secret =
        input.secret === null ? existing?.secret ?? "" : input.secret.trim()
      upsert.run(
        workspaceId,
        input.provider,
        input.url,
        secret,
        input.enabled ? 1 : 0,
        new Date().toISOString()
      )
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

/** 只看有没有可用地址：采集前快速判断，避免每次建连接。 */
export function hasEnabledWebhook(workspaceId: WorkspaceId): boolean {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM webhook_endpoints
       WHERE workspace_id = ? AND enabled = 1 AND url <> ''`
    )
    .get(workspaceId) as { count: number }
  return row.count > 0
}
