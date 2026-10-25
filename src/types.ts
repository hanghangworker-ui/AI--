// ============ CampusFlow AI 数据实体定义 ============

export interface Student {
  id: string
  name: string
  studentNo: string
  grade: string
  major: string
  email: string
  avatarColor: string
  histGpa?: number // 历史累计绩点（新注册学生为 8.0 / 0 学分）
  histCredits?: number // 历史已修学分
}

export interface Course {
  id: string
  name: string
  nameEn: string
  teacher: string
  credits: number
  color: string // 主题色（Tailwind 类名中的色值段）
}

export interface TimetableEntry {
  id: string
  courseId: string
  day: number // 0=周一 ... 6=周日
  startMin: number // 开始分钟数（相对 00:00）
  endMin: number
  room: string
  kind: 'lecture' | 'lab' | 'tutorial'
  conflictWith?: string // 冲突的另一条 entry id
  alternative?: { day: number; startMin: number; endMin: number; room: string }
  status: 'normal' | 'conflict' | 'adjusted'
}

export interface AttendanceRecord {
  id: string
  courseId: string
  date: string // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused'
}

export interface ExamResult {
  id: string
  courseId: string
  title: string // 期中考试 / 平时测验 / 期末考试
  score: number // 百分制
  date: string
  weight: number // 占总评权重 %
}

export interface CourseGrade {
  courseId: string
  currentScore: number // 当前综合百分制成绩
  trend: 'up' | 'down' | 'flat' // 近期趋势
  history: { title: string; score: number; date: string }[]
}

export interface StudyTask {
  id: string
  title: string
  courseId?: string
  estimatedMin: number
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'doing' | 'done'
  fromAI: boolean
  createdAt: string
}

export interface GoalPlan {
  id: string
  type: 'cgpa' | 'course'
  targetCgpa?: number
  targetCourseId?: string
  targetScore?: number
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  actions?: ChatAction[]
  fallback?: boolean // 是否为本地回退回答
  dataUsed?: string[] // 本次回答引用的数据类别
}

export interface ChatAction {
  label: string
  to: string // 路由路径
}

export interface AIConversation {
  id: string
  title: string
  createdAt: string
  messages: ChatMessage[]
}

export interface AIProviderConfig {
  provider: 'builtin' | 'dify' | 'deepseek' | 'openai'
  apiKey: string
  baseUrl: string
  model: string
  grants: {
    timetable: boolean
    attendance: boolean
    grades: boolean
    tasks: boolean
  }
}

export interface AppNotification {
  id: string
  title: string
  body: string
  level: 'info' | 'warn' | 'risk'
  date: string
  read: boolean
}

// 出勤状态颜色语义
export const ATTEND_LABEL: Record<AttendanceRecord['status'], { zh: string; en: string; cls: string }> = {
  present: { zh: '出勤', en: 'Present', cls: 'bg-emerald-100 text-emerald-700' },
  absent: { zh: '缺勤', en: 'Absent', cls: 'bg-red-100 text-red-600' },
  late: { zh: '迟到', en: 'Late', cls: 'bg-amber-100 text-amber-700' },
  excused: { zh: '请假', en: 'Excused', cls: 'bg-slate-100 text-slate-600' },
}

export const PRIORITY_LABEL: Record<StudyTask['priority'], { zh: string; en: string; cls: string }> = {
  high: { zh: '高', en: 'High', cls: 'bg-red-100 text-red-600' },
  medium: { zh: '中', en: 'Medium', cls: 'bg-amber-100 text-amber-700' },
  low: { zh: '低', en: 'Low', cls: 'bg-slate-100 text-slate-500' },
}
