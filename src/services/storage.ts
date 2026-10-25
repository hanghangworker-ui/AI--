// localStorage 封装：带 JSON 序列化与异常保护
const PREFIX = 'campusflow:'

export function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 忽略存储异常（隐私模式等），演示不中断
  }
}

export function removeLS(key: string): void {
  try { localStorage.removeItem(PREFIX + key) } catch { /* noop */ }
}
