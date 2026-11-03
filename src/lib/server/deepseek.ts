import "server-only"

import { logEvent } from "@/lib/server/logger"

/**
 * DeepSeek 对话接口的服务端封装。
 * Key 只从设置页保存的值或环境变量读取，不进入客户端 bundle，也不写日志。
 *
 * 生产约束：
 * - 超时：默认 90s，抓取类调用可单独传；
 * - 重试：只对 429 / 5xx / 超时 / 空 content / 非 JSON 这类「重试可能变好」的失败重试一次，
 *   4xx（除 429）直接失败，避免无意义地重复花钱；
 * - 计量：每次成功调用记一条 `ai.call` 日志（模型、耗时、token），便于核算成本。
 */

const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-flash"

export class DeepSeekError extends Error {
  status: number
  retryable: boolean

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message)
    this.name = "DeepSeekError"
    this.status = options.status ?? 0
    this.retryable = options.retryable ?? false
  }
}

function envApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new DeepSeekError("对话模型 API Key 未配置", { retryable: false })
  return key
}

type PostResult<T> = {
  data: T
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  ms: number
}

async function post<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
  apiKey: string
): Promise<PostResult<T>> {
  const started = Date.now()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ""
    const timeout = name === "TimeoutError" || name === "AbortError"
    throw new DeepSeekError(
      timeout
        ? `DeepSeek 请求超过 ${Math.round(timeoutMs / 1000)}s 未返回`
        : `DeepSeek 请求失败：${error instanceof Error ? error.message : String(error)}`,
      { retryable: true }
    )
  }

  const text = await response.text()
  if (!response.ok) {
    throw new DeepSeekError(
      `DeepSeek ${path} ${response.status}: ${text.slice(0, 240)}`,
      {
        status: response.status,
        retryable: response.status === 408 || response.status === 409 ||
          response.status === 425 || response.status === 429 || response.status >= 500,
      }
    )
  }

  let data: T & { usage?: PostResult<T>["usage"] }
  try {
    data = JSON.parse(text) as T & { usage?: PostResult<T>["usage"] }
  } catch {
    throw new DeepSeekError(`DeepSeek 返回了非 JSON 内容：${text.slice(0, 160)}`, {
      retryable: true,
    })
  }
  return { data, usage: data.usage, ms: Date.now() - started }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export function isChatConfigured(apiKey?: string | null): boolean {
  return Boolean(apiKey?.trim() || process.env.DEEPSEEK_API_KEY)
}

export type DeepSeekJSONOptions = {
  timeoutMs?: number
  maxTokens?: number
  model?: string
  temperature?: number
  /** 设置页里为 DeepSeek 搜索源保存的 Key；缺省时回退环境变量。 */
  apiKey?: string | null
  /** 额外重试次数，默认 1（合计最多 2 次请求）。 */
  retries?: number
  /** 写日志用的任务名：classify / brief。 */
  task?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stripFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
}

export async function deepseekJSON<T>(
  messages: ChatMessage[],
  options: DeepSeekJSONOptions = {}
): Promise<T> {
  const model = options.model ?? MODEL
  const timeoutMs = options.timeoutMs ?? 90_000
  const apiKey = options.apiKey?.trim() || envApiKey()
  const attempts = Math.max(0, options.retries ?? 1) + 1

  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { data, usage, ms } = await post<{
        choices?: { message?: { content?: string }; finish_reason?: string }[]
      }>(
        "/chat/completions",
        {
          model,
          messages,
          response_format: { type: "json_object" },
          // deepseek-flash 默认开启 thinking；结构化 JSON 任务关掉它，
          // 避免 reasoning token 吃满 max_tokens、content 为空。
          thinking: { type: "disabled" },
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 4096,
        },
        timeoutMs,
        apiKey
      )

      const choice = data.choices?.[0]
      const raw = choice?.message?.content ?? ""
      if (!raw.trim()) {
        // content 为空多半是 max_tokens 被 thinking 或超长输出吃满，重试一次仍空就明确报错。
        throw new DeepSeekError(
          `模型返回空内容（finish_reason=${choice?.finish_reason ?? "unknown"}，max_tokens=${options.maxTokens ?? 4096}）`,
          { retryable: true }
        )
      }

      const cleaned = stripFence(raw)
      let parsed: T
      try {
        parsed = JSON.parse(cleaned) as T
      } catch {
        throw new DeepSeekError(`模型返回的不是合法 JSON：${cleaned.slice(0, 160)}`, {
          retryable: true,
        })
      }

      logEvent("info", "ai.call", {
        task: options.task ?? "chat",
        model,
        attempt,
        ms,
        promptTokens: usage?.prompt_tokens ?? null,
        completionTokens: usage?.completion_tokens ?? null,
      })
      return parsed
    } catch (error) {
      lastError = error
      const retryable = error instanceof DeepSeekError ? error.retryable : false
      if (!retryable || attempt >= attempts) break
      logEvent("warn", "ai.retry", {
        task: options.task ?? "chat",
        model,
        attempt,
        reason: error instanceof Error ? error.message.slice(0, 160) : String(error),
      })
      await sleep(500 * attempt)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new DeepSeekError("DeepSeek 调用失败")
}
