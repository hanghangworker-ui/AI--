// 学生数据服务：第一阶段基于 Mock + localStorage，接口不变即可接真实后端
import type {
  StudyTask, AppNotification, AIConversation, AIProviderConfig, AttendanceRecord,
  Course, TimetableEntry, ExamResult, CourseGrade, Student,
} from '../types'
import {
  student, courses, timetable, attendance, examResults, courseGrades,
  initialTasks, notifications as mockNotifs, initialConversations,
} from '../data/mockData'
import { loadLS, saveLS, removeLS } from './storage'

// ---------- 静态数据 ----------
export const getStudent = (): Student => student
export const getCourses = (): Course[] => courses
export const getTimetable = (): TimetableEntry[] => loadLS('timetable', timetable)
export const saveTimetable = (tt: TimetableEntry[]) => saveLS('timetable', tt)
export const getAttendance = (): AttendanceRecord[] => attendance
export const getExamResults = (): ExamResult[] => examResults
export const getCourseGrades = (): CourseGrade[] => courseGrades

// ---------- 可变数据（localStorage 持久化） ----------
export const getTasks = (): StudyTask[] => loadLS('tasks', initialTasks)
export const saveTasks = (t: StudyTask[]) => saveLS('tasks', t)

export const getNotifications = (): AppNotification[] => loadLS('notifications', mockNotifs)
export const saveNotifications = (n: AppNotification[]) => saveLS('notifications', n)

export const getConversations = (): AIConversation[] => loadLS('conversations', initialConversations)
export const saveConversations = (c: AIConversation[]) => saveLS('conversations', c)

export const getDefaultAIConfig = (): AIProviderConfig => ({
  provider: 'builtin',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  grants: { timetable: true, attendance: true, grades: true, tasks: true },
})
export const getAIConfig = (): AIProviderConfig => loadLS('aiConfig', getDefaultAIConfig())
export const saveAIConfig = (c: AIProviderConfig) => saveLS('aiConfig', c)

// ---------- 登录状态 ----------
export const isLoggedIn = () => loadLS('login', false)
export const setLogin = (v: boolean) => saveLS('login', v)
export const logout = () => { removeLS('login'); removeLS('timetable') }

// ---------- 派生计算 ----------
export const courseById = (id: string) => courses.find(c => c.id === id)

/** 课程出勤率（0-100） */
export function courseAttendanceRate(courseId: string): number {
  const recs = attendance.filter(a => a.courseId === courseId)
  if (recs.length === 0) return 100
  const present = recs.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length
  return Math.round((present / recs.length) * 100)
}

/** 总体出勤率 */
export function overallAttendanceRate(): number {
  const recs = attendance
  const present = recs.filter(r => r.status !== 'absent').length
  return Math.round((present / recs.length) * 100)
}

/** 今日课程（按时间排序） */
export function todayEntries(): TimetableEntry[] {
  const day = (new Date().getDay() + 6) % 7
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const tt = getTimetable()
  return tt
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

/** 当前学期 SGPA 与累计 CGPA（8.4 为计划书演示值，实际按成绩表推导） */
export function computeSGPA(): number {
  const totalCredit = courses.reduce((s, c) => s + c.credits, 0)
  const weighted = courseGrades.reduce((s, g) => s + scoreToGP(g.currentScore) * (courseById(g.courseId)?.credits ?? 0), 0)
  return Math.round((weighted / totalCredit) * 100) / 100
}

export function computeCGPA(): number {
  // 演示：CGPA = 上学期 8.5 与本学期 SGPA 的加权（历史学分 30 / 本学期 17.5）
  const histGPA = 8.5, histCredits = 30
  const sgpa = computeSGPA()
  const nowCredits = courses.reduce((s, c) => s + c.credits, 0)
  return Math.round(((histGPA * histCredits + sgpa * nowCredits) / (histCredits + nowCredits)) * 100) / 100
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
  const avgScore = courseGrades.reduce((s, g) => s + g.currentScore, 0) / courseGrades.length
  const trendMod = courseGrades.reduce((s, g) => s + (g.trend === 'up' ? 4 : g.trend === 'down' ? -5 : 0), 0)
  const gradeScore = Math.max(0, Math.min(100, Math.round(avgScore + trendMod)))
  // 3) 任务完成率 20%
  const tasks = getTasks()
  const doneRate = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
  // 4) 课程负荷平衡 20%：每周 17 课时视为适中
  const weekHours = timetable.length * 2
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
  return courses
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
