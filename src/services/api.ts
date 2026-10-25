// 后端 REST 客户端：health 探测、JWT 登录、数据水合（hydrate）、写操作同步
// 设计原则：后端在线则数据以 SQLite 为准；离线自动降级为本地 Mock，页面零感知

const API_BASE = '/api'
const TOKEN_KEY = 'cf_token'

let backendOnline = false
export const isBackendOnline = () => backendOnline
export const hasToken = () => !!localStorage.getItem(TOKEN_KEY)

// ---------- 错误类型（携带 HTTP 状态码，供注册/登录区分 400/401/409/网络失败） ----------
export class ApiError extends Error {
  status: number
  serverMessage: string
  constructor(status: number, serverMessage: string) {
    super(serverMessage || String(status))
    this.status = status
    this.serverMessage = serverMessage
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    throw new ApiError(401, 'unauthorized')
  }
  if (!res.ok) {
    // 优先取服务端返回的错误说明（后端 JSON: { error, message }）
    let msg = `${res.status}`
    try { const j = await res.json(); if (j && j.message) msg = String(j.message) } catch { /* body 非 JSON */ }
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

/** 探测本地后端是否在线（3001 或同源代理） */
export async function probeBackend(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal })
    clearTimeout(timer)
    backendOnline = res.ok
    return backendOnline
  } catch {
    backendOnline = false
    return false
  }
}

// ---------- 登录 ----------
export interface LoginResult { token: string; student: Record<string, unknown> }

export async function apiLogin(studentNo: string, password: string): Promise<LoginResult> {
  const data = await request<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ studentNo, password }),
  })
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

// ---------- 注册（成功即登录，返回 token） ----------
export async function apiRegister(
  studentNo: string, name: string, password: string, withDemoData: boolean
): Promise<LoginResult> {
  const data = await request<LoginResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ studentNo, name, password, withDemoData }),
  })
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// ---------- 数据水合：拉全量 overview 并分发到本地缓存 ----------
export interface OverviewData {
  student: Record<string, unknown>
  courses: unknown[]
  timetable: unknown[]
  attendance: unknown[]
  examResults: unknown[]
  courseGrades: unknown[]
  tasks: unknown[]
  notifications: unknown[]
  conversations: unknown[]
  summary: {
    attendanceRate: number
    sgpa: number
    cgpa: number
    health: { total: number; parts: { key: string; weight: number; score: number }[] }
    risks: { courseId: string; rate: number; level: 'below' | 'near' }[]
    streak: number
    grants: Record<string, boolean>
    notifPrefs: Record<string, boolean>
  }
}

export async function fetchOverview(): Promise<OverviewData> {
  const data = await request<OverviewData>('/student/overview')
  localStorage.setItem('cf_remote', JSON.stringify(data))
  return data
}

// ---------- 写操作同步（fire-and-forget + 800ms 防抖，离线时静默跳过） ----------
const pendingTimers: Record<string, number> = {}

function debounceSync(key: string, path: string, body: Record<string, unknown>) {
  if (!backendOnline || !hasToken()) return
  clearTimeout(pendingTimers[key])
  pendingTimers[key] = window.setTimeout(() => {
    request(path, { method: 'POST', body: JSON.stringify(body) }).catch(() => {
      /* 同步失败静默：下次登录 hydrate 时以后端为准，本地演示不中断 */
    })
  }, 800)
}

export const syncTasks = (tasks: unknown[]) => debounceSync('tasks', '/sync/tasks', { tasks })
export const syncTimetable = (timetable: unknown[]) => debounceSync('timetable', '/sync/timetable', { timetable })
export const syncNotifications = (notifications: unknown[]) => debounceSync('notifications', '/sync/notifications', { notifications })
export const syncConversations = (conversations: unknown[]) => debounceSync('conversations', '/sync/conversations', { conversations })

export async function syncSettings(grants: Record<string, boolean>, notifPrefs?: Record<string, boolean>) {
  if (!backendOnline || !hasToken()) return
  try {
    await request('/student/settings', { method: 'PUT', body: JSON.stringify({ grants, notifPrefs }) })
  } catch { /* 静默 */ }
}

// ---------- AI 代理 ----------
export interface AIProxyAnswer {
  content: string
  actions: { label: string; to: string }[]
  dataUsed: string[]
  fallback: boolean
}

export async function apiAIChat(question: string, provider: string, model: string, baseUrl: string, lang: string): Promise<AIProxyAnswer> {
  return request<AIProxyAnswer>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ question, provider, model, baseUrl, lang }),
  })
}
