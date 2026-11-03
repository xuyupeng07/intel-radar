/**
 * 密钥掩码：只露前后各 4 位，中间统一 6 个点。
 * 客户端展示与服务端比对「是否为未修改的掩码」共用这一份规则。
 */
export function maskSecret(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.length <= 8) return "••••••••"
  return `${trimmed.slice(0, 4)}••••••${trimmed.slice(-4)}`
}

/** 判断用户提交的是不是页面回显的掩码（等于没改）。 */
export function isMaskedValue(submitted: string, saved: string): boolean {
  if (!submitted || !saved) return false
  return submitted.trim() === maskSecret(saved)
}
