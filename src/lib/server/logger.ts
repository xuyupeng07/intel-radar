/**
 * 结构化日志：一行一个 JSON，方便 Sealos / Loki 按 event 检索。
 *
 * 约定：fields 里不要放 API Key、口令、完整 prompt；需要定位问题时放 id / 计数 / 耗时。
 */

type Level = "info" | "warn" | "error"

function write(level: Level, event: string, fields: Record<string, unknown>): void {
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  })
  if (level === "error") console.error(payload)
  else if (level === "warn") console.warn(payload)
  else console.info(payload)
}

export function logEvent(
  level: Level,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  write(level, event, fields)
}

export function logInfo(event: string, fields?: Record<string, unknown>): void {
  write("info", event, fields ?? {})
}

export function logWarn(event: string, fields?: Record<string, unknown>): void {
  write("warn", event, fields ?? {})
}

export function logError(event: string, fields?: Record<string, unknown>): void {
  write("error", event, fields ?? {})
}

/** 错误对象转成可安全落日志 / 返回的短文本。 */
export function errorText(error: unknown, max = 400): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\s+/g, " ").trim().slice(0, max)
}
