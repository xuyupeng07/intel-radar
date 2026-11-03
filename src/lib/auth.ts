/**
 * 访问口令与会话（登录页 / proxy / 健康检查共用）。
 *
 * 这里只用 Web Crypto：proxy 跑在 edge runtime，不能用 node:crypto。
 * 会话是自签的（无数据库）：`<过期时间戳>.<HMAC-SHA256 签名>`，
 * 签名密钥直接取访问口令，所以不需要额外的 secret 环境变量。
 */

export const AUTH_ENV_PASSWORD = "APP_AUTH_PASSWORD"
export const SESSION_COOKIE = "intel_session"
/** 会话有效期：7 天。 */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

const encoder = new TextEncoder()

export function configuredPassword(
  env: Record<string, string | undefined> = process.env
): string | null {
  const password = env[AUTH_ENV_PASSWORD]?.trim()
  return password ? password : null
}

function base64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function digest(value: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value))
  return new Uint8Array(hash)
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return base64Url(new Uint8Array(signature))
}

/** 定长比较：两边先取 SHA-256，再逐字节累积差异，避免按字符提前返回。 */
export async function isPasswordValid(
  input: string,
  expected: string
): Promise<boolean> {
  if (!input || !expected) return false
  const [left, right] = await Promise.all([digest(input), digest(expected)])
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

/** 签发会话 token：`<expiresAt>.<hmac>`。 */
export async function createSessionToken(
  password: string,
  ttlSeconds = SESSION_TTL_SECONDS
): Promise<string> {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const payload = String(expiresAt)
  return `${payload}.${await sign(password, payload)}`
}

/** 校验会话 token：签名对得上且没过期。 */
export async function verifySessionToken(
  token: string | undefined | null,
  password: string,
  now = Date.now()
): Promise<boolean> {
  if (!token) return false
  const separator = token.lastIndexOf(".")
  if (separator <= 0) return false

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expiresAt = Number(payload)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  const expected = await sign(password, payload)
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index)
  }
  return diff === 0
}

/** 只允许站内相对路径，挡掉 `//evil.com` 这类开放重定向。 */
export function safeNextPath(value: unknown, fallback = "/today"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback
  if (value.startsWith("//") || value.includes("\\")) return fallback
  return value
}

export const AUTH_NOT_CONFIGURED_BODY = `访问口令未配置（${AUTH_ENV_PASSWORD} 为空）。

请在部署环境里设置：
  ${AUTH_ENV_PASSWORD}=<一串足够长的随机口令>

保存后重启容器即可。健康检查 /api/health 不受影响。
`
