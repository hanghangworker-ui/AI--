// 学生数据服务：后端在线时以 SQLite 数据为准，离线自动降级 Mock（页面零感知）
import type {
  StudyTask, AppNotification, AIConversation, AIProviderConfig, AttendanceRecord,
  Course, TimetableEntry, ExamResult, CourseGrade, Student,
} from '../types'
import {
  student, courses as mockCourses, timetable as mockTimetable, attendance as mockAttendance,
  examResults as mockExams, courseGrades as mockGrades,
  initialTasks, notifications as mockNotifs, initialConversations,
} from '../data/mockData'
import { loadLS, saveLS, removeLS } from './storage'
import {
  probeBackend, fetchOverview, syncTasks, syncTimetable, syncNotifications,
  syncConversations, syncSettings, clearToken, isBackendOnline,
} from './api'

// ---------- 远程缓存（登录后 hydrate 写入；离线时为 null） ----------
interface RemoteData {
  student: Student
  courses: Course[]
  timetable: TimetableEntry[]
  attendance: AttendanceRecord[]
  examResults: ExamResult[]
  courseGrades: CourseGrade[]
  tasks: StudyTask[]
  notifications: AppNotification[]
  conversations: AIConversation[]
  summary: {
    attendanceRate: number
    sgpa: number
    cgpa: number
    risks: { courseId: string; rate: number; level: 'below' | 'near' }[]
  }
}
function remote(): RemoteData | null {
  try {
    const s = localStorage.getItem('cf_remote')
    return s ? (JSON.parse(s) as RemoteData) : null
  } catch { return null }
}
export const usingRemote = () => remote() !== null

// ---------- 数据读取（远程优先，Mock 兜底） ----------
export const getStudent = (): Student => remote()?.student ?? student
export const getCourses = (): Course[] => remote()?.courses ?? mockCourses
export const getAttendance = (): AttendanceRecord[] => remote()?.attendance ?? mockAttendance
export const getExamResults = (): ExamResult[] => remote()?.examResults ?? mockExams
export const getCourseGrades = (): CourseGrade[] => remote()?.courseGrades ?? mockGrades

export const getTimetable = (): TimetableEntry[] => loadLS('timetable', remote()?.timetable ?? mockTimetable)

// ---------- 写操作：本地即时生效 + 后端异步同步（fire-and-forget） ----------
export const saveTimetable = (tt: TimetableEntry[]) => { saveLS('timetable', tt); syncTimetable(tt) }

// 任务/通知/会话：远程数据优先兜底（新注册学生不应看到别人的演示数据）
export const getTasks = (): StudyTask[] => loadLS('tasks', remote()?.tasks ?? initialTasks)
export const saveTasks = (t: StudyTask[]) => { saveLS('tasks', t); syncTasks(t) }

export const getNotifications = (): AppNotification[] => loadLS('notifications', remote()?.notifications ?? mockNotifs)
export const saveNotifications = (n: AppNotification[]) => { saveLS('notifications', n); syncNotifications(n) }

export const getConversations = (): AIConversation[] => loadLS('conversations', remote()?.conversations ?? initialConversations)
export const saveConversations = (c: AIConversation[]) => { saveLS('conversations', c); syncConversations(c) }

export const getDefaultAIConfig = (): AIProviderConfig => ({
  provider: 'builtin',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  grants: { timetable: true, attendance: true, grades: true, tasks: true },
})
export const getAIConfig = (): AIProviderConfig => loadLS('aiConfig', getDefaultAIConfig())
export const saveAIConfig = (c: AIProviderConfig) => {
  saveLS('aiConfig', c)
  syncSettings(c.grants) // 数据授权同步到数据库，服务端 AI 代理遵守
}

// ---------- 登录状态 ----------
export const isLoggedIn = () => loadLS('login', false)
export const setLogin = (v: boolean) => saveLS('login', v)

/** 登录后水合：探测后端 → 拉全量数据 → 分发本地缓存；离线返回 false */
export async function hydrateFromServer(): Promise<boolean> {
  const online = await probeBackend()
  if (!online) return false
  try {
    const data = await fetchOverview()
    // 注意：必须走 saveLS（前缀 campusflow:），与 getTasks 等读取端一致
    saveLS('tasks', data.tasks)
    saveLS('timetable', data.timetable)
    saveLS('notifications', data.notifications)
    saveLS('conversations', data.conversations)
    // 数据授权与数据库对齐（后端 AI 代理以此为准）
    const cfg = getAIConfig()
    saveLS('aiConfig', { ...cfg, grants: { ...cfg.grants, ...data.summary.grants } })
    // 清理历史版本误写的裸 key（旧版 hydrate 未加 campusflow: 前缀，会导致数据串号）
    for (const k of ['tasks', 'timetable', 'notifications', 'conversations']) {
      try { localStorage.removeItem(k) } catch { /* noop */ }
    }
    return true
  } catch {
    return false
  }
}

export function logout() {
  removeLS('login')
  // cf_remote 由 api.ts 以裸 key 写入，此处清理裸 key
  try { localStorage.removeItem('cf_remote') } catch { /* noop */ }
  clearToken()
}

export { isBackendOnline }

// ---------- 派生计算（基于当前数据源，远程/本地算法一致） ----------
export const courseById = (id: string) => getCourses().find(c => c.id === id)

/** 课程出勤率（0-100） */
export function courseAttendanceRate(courseId: string): number {
  const recs = getAttendance().filter(a => a.courseId === courseId)
  if (recs.length === 0) return 100
  const present = recs.filter(r => r.status !== 'absent').length
  return Math.round((present / recs.length) * 100)
}

/** 总体出勤率 */
export function overallAttendanceRate(): number {
  const recs = getAttendance()
  const present = recs.filter(r => r.status !== 'absent').length
  return recs.length ? Math.round((present / recs.length) * 100) : 100
}

/** 今日课程（按时间排序） */
export function todayEntries(): TimetableEntry[] {
  const day = (new Date().getDay() + 6) % 7
  return getTimetable()
    .filter(e => e.day === day)
    .sort((a, b) => a.startMin - b.startMin)
    .map(e => ({ ...e, startMin: e.status === 'adjusted' && e.alternative ? e.alternative.startMin : e.startMin }))
}

/** 下一节课（今天中还未开始的） */
export function nextClass(): TimetableEntry | null {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  return todayEntries().find(e => e.startMin > nowMin) ?? null
}

/** 百分制 → 绩点（10 分制） */
export function scoreToGP(score: number): number {
  if (score >= 90) return 10
  if (score >= 80) return 9
  if (score >= 70) return 8
  if (score >= 60) return 6.5
  return 0
}

/** 当前学期 SGPA */
export function computeSGPA(): number {
  const courses = getCourses()
  const totalCredit = courses.reduce((s, c) => s + c.credits, 0)
  if (totalCredit === 0) return 0 // 新注册学生暂无课程成绩
  const weighted = getCourseGrades().reduce((s, g) => s + scoreToGP(g.currentScore) * (courseById(g.courseId)?.credits ?? 0), 0)
  return Math.round((weighted / totalCredit) * 100) / 100
}

/** 累计 CGPA：历史绩点（远程学生档案优先）与本学期 SGPA 按学分加权 */
export function computeCGPA(): number {
  const stu = getStudent()
  const histGPA = stu.histGpa ?? 8.5
  const histCredits = stu.histCredits ?? 30
  const sgpa = computeSGPA()
  const nowCredits = getCourses().reduce((s, c) => s + c.credits, 0)
  const total = histCredits + nowCredits
  if (total === 0) return 0 // 新注册学生：无历史学分且暂无成绩
  return Math.round(((histGPA * histCredits + sgpa * nowCredits) / total) * 100) / 100
}

/** 学习健康度（0-100）+ 评分依据 */
export interface HealthScore {
  total: number
  parts: { key: string; weight: number; score: number }[]
}
export function computeHealthScore(): HealthScore {
  // 1) 出勤稳定性 30%：以总体出勤率为基准，>=95 满分
  const att = overallAttendanceRate()
  const attScore = Math.min(100, Math.round(att / 0.95))
  // 2) 成绩趋势 30%：平均成绩 + 上升/下降修正
  const grades = getCourseGrades()
  const avgScore = grades.length ? grades.reduce((s, g) => s + g.currentScore, 0) / grades.length : 0
  const trendMod = grades.reduce((s, g) => s + (g.trend === 'up' ? 4 : g.trend === 'down' ? -5 : 0), 0)
  const gradeScore = Math.max(0, Math.min(100, Math.round(avgScore + trendMod)))
  // 3) 任务完成率 20%
  const tasks = getTasks()
  const doneRate = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
  // 4) 课程负荷平衡 20%：每周 17 课时视为适中
  const weekHours = getTimetable().length * 2
  const loadScore = Math.max(40, Math.round(100 - Math.abs(weekHours - 17) * 4))
  const total = Math.round(attScore * 0.3 + gradeScore * 0.3 + doneRate * 0.2 + loadScore * 0.2)
  return {
    total,
    parts: [
      { key: 'dash.attStability', weight: 30, score: attScore },
      { key: 'dash.scoreTrend', weight: 30, score: gradeScore },
      { key: 'dash.taskRate', weight: 20, score: doneRate },
      { key: 'dash.loadBalance', weight: 20, score: loadScore },
    ],
  }
}

/** 考勤风险课程（<85% 警戒线，85-88% 提示接近） */
export function attendanceRisks(): { courseId: string; rate: number; level: 'below' | 'near' }[] {
  return getCourses()
    .map(c => ({ courseId: c.id, rate: courseAttendanceRate(c.id), level: 'near' as const }))
    .filter(r => r.rate < 88)
    .map(r => ({ ...r, level: (r.rate < 85 ? 'below' : 'near') as 'below' | 'near' }))
}

/** 连续学习天数：从今天向前数每日有完成任务 */
export function studyStreak(): number {
  const tasks = getTasks()
  const doneDays = new Set(tasks.filter(t => t.status === 'done').map(t => t.dueDate))
  let streak = 0
  const d = new Date()
  while (streak < 60) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (doneDays.has(iso)) { streak++; d.setDate(d.getDate() - 1) } else break
  }
  return streak
}
