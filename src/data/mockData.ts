import type {
  Student, Course, TimetableEntry, AttendanceRecord,
  ExamResult, CourseGrade, StudyTask, AppNotification, AIConversation,
} from '../types'

// ---------- 日期工具：所有演示数据以"今天"为基准动态生成 ----------
export const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = new Date()
export const todayISO = toISO(today)
export const addDays = (base: Date, n: number) => {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}
export const addDaysISO = (n: number) => toISO(addDays(today, n))
// 本周周一（今天所在周）
export const monday = (() => {
  const d = new Date(today)
  const day = (d.getDay() + 6) % 7 // 周一=0
  d.setDate(d.getDate() - day)
  return d
})()

export const student: Student = {
  id: 'stu-001',
  name: '李明',
  studentNo: 'ST2026001',
  grade: '大二',
  major: '计算机科学与技术',
  email: 'liming@stu.czu.edu.cn',
  avatarColor: 'bg-indigo-500',
}

export const courses: Course[] = [
  { id: 'c-ds', name: '数据结构', nameEn: 'Data Structures', teacher: '王建国', credits: 4, color: 'indigo' },
  { id: 'c-dm', name: '离散数学', nameEn: 'Discrete Mathematics', teacher: '陈静', credits: 3, color: 'teal' },
  { id: 'c-ml', name: '机器学习', nameEn: 'Machine Learning', teacher: '刘洋', credits: 4, color: 'violet' },
  { id: 'c-db', name: '数据库原理', nameEn: 'Database Principles', teacher: '赵芳', credits: 3.5, color: 'sky' },
  { id: 'c-oo', name: '面向对象程序设计', nameEn: 'OOP Design', teacher: '孙伟', credits: 3, color: 'amber' },
]

const T = (h: number, m = 0) => h * 60 + m

// 周课表：预置一条"机器学习答疑课 vs 数据结构"的时间冲突（周三 14:00）
export const timetable: TimetableEntry[] = [
  { id: 'tt1', courseId: 'c-ds', day: 0, startMin: T(8), endMin: T(9, 40), room: '教学楼 A301', kind: 'lecture', status: 'normal' },
  { id: 'tt2', courseId: 'c-dm', day: 0, startMin: T(10), endMin: T(11, 40), room: '教学楼 B205', kind: 'lecture', status: 'normal' },
  { id: 'tt3', courseId: 'c-oo', day: 1, startMin: T(8), endMin: T(9, 40), room: '实验楼 C102', kind: 'lab', status: 'normal' },
  { id: 'tt4', courseId: 'c-db', day: 1, startMin: T(14), endMin: T(15, 40), room: '教学楼 A505', kind: 'lecture', status: 'normal' },
  { id: 'tt5', courseId: 'c-ml', day: 2, startMin: T(8), endMin: T(9, 40), room: '教学楼 B301', kind: 'lecture', status: 'normal' },
  { id: 'tt6', courseId: 'c-ds', day: 2, startMin: T(14), endMin: T(16), room: '实验楼 C201', kind: 'tutorial', status: 'conflict', conflictWith: 'tt7' },
  { id: 'tt7', courseId: 'c-ml', day: 2, startMin: T(14), endMin: T(15, 40), room: '教学楼 A203', kind: 'tutorial', status: 'conflict', conflictWith: 'tt6',
    alternative: { day: 3, startMin: T(16), endMin: T(17, 40), room: '实验楼 C201' } },
  { id: 'tt8', courseId: 'c-dm', day: 3, startMin: T(8), endMin: T(9, 40), room: '教学楼 B205', kind: 'lecture', status: 'normal' },
  { id: 'tt9', courseId: 'c-oo', day: 3, startMin: T(10), endMin: T(11, 40), room: '教学楼 A402', kind: 'lecture', status: 'normal' },
  { id: 'tt10', courseId: 'c-db', day: 4, startMin: T(8), endMin: T(9, 40), room: '实验楼 C305', kind: 'lab', status: 'normal' },
  { id: 'tt11', courseId: 'c-ml', day: 4, startMin: T(10), endMin: T(11, 40), room: '教学楼 B301', kind: 'lecture', status: 'normal' },
]

// 考勤记录：总体出勤率 87%
export const attendance: AttendanceRecord[] = (() => {
  const records: AttendanceRecord[] = []
  // 每门课固定比例的出勤模式；"机器学习"接近警戒线（83%）
  const ratio: Record<string, { present: number; absent: number; late: number }> = {
    'c-ds': { present: 17, absent: 1, late: 2 },
    'c-dm': { present: 17, absent: 1, late: 1 },
    'c-ml': { present: 14, absent: 2, late: 2 },
    'c-db': { present: 16, absent: 1, late: 1 },
    'c-oo': { present: 18, absent: 0, late: 0 },
  }
  let idx = 0
  for (const c of courses) {
    const r = ratio[c.id]
    const seq: AttendanceRecord['status'][] = []
    for (let i = 0; i < r.present; i++) seq.push('present')
    for (let i = 0; i < r.absent; i++) seq.push('absent')
    for (let i = 0; i < r.late; i++) seq.push('late')
    // 从 40 天前开始，每 2 天一条
    seq.forEach((st, i) => {
      records.push({
        id: `att-${idx++}`,
        courseId: c.id,
        date: addDaysISO(-42 + i * 2),
        status: st,
      })
    })
  }
  return records
})()

export const examResults: ExamResult[] = [
  { id: 'ex1', courseId: 'c-ds', title: '平时测验 1', score: 84, date: addDaysISO(-60), weight: 10 },
  { id: 'ex2', courseId: 'c-ds', title: '期中考试', score: 78, date: addDaysISO(-25), weight: 30 },
  { id: 'ex3', courseId: 'c-dm', title: '随堂测验', score: 90, date: addDaysISO(-40), weight: 10 },
  { id: 'ex4', courseId: 'c-dm', title: '期中考试', score: 92, date: addDaysISO(-22), weight: 30 },
  { id: 'ex5', courseId: 'c-ml', title: '平时测验', score: 88, date: addDaysISO(-38), weight: 10 },
  { id: 'ex6', courseId: 'c-ml', title: '期中考试', score: 81, date: addDaysISO(-20), weight: 30 },
  { id: 'ex7', courseId: 'c-db', title: '实验报告评分', score: 86, date: addDaysISO(-35), weight: 15 },
  { id: 'ex8', courseId: 'c-db', title: '期中考试', score: 89, date: addDaysISO(-18), weight: 30 },
  { id: 'ex9', courseId: 'c-oo', title: '编程作业', score: 94, date: addDaysISO(-30), weight: 15 },
  { id: 'ex10', courseId: 'c-oo', title: '期中考试', score: 95, date: addDaysISO(-15), weight: 30 },
]

export const courseGrades: CourseGrade[] = [
  { courseId: 'c-ds', currentScore: 81, trend: 'down', history: [{ title: '测验1', score: 84, date: addDaysISO(-60) }, { title: '期中', score: 78, date: addDaysISO(-25) }] },
  { courseId: 'c-dm', currentScore: 91, trend: 'up', history: [{ title: '随堂', score: 90, date: addDaysISO(-40) }, { title: '期中', score: 92, date: addDaysISO(-22) }] },
  { courseId: 'c-ml', currentScore: 84, trend: 'down', history: [{ title: '测验', score: 88, date: addDaysISO(-38) }, { title: '期中', score: 81, date: addDaysISO(-20) }] },
  { courseId: 'c-db', currentScore: 88, trend: 'up', history: [{ title: '实验', score: 86, date: addDaysISO(-35) }, { title: '期中', score: 89, date: addDaysISO(-18) }] },
  { courseId: 'c-oo', currentScore: 95, trend: 'up', history: [{ title: '作业', score: 94, date: addDaysISO(-30) }, { title: '期中', score: 95, date: addDaysISO(-15) }] },
]

// 下一场考试：12 天后（数据结构期末）
export const nextExam = { courseId: 'c-ds', title: '数据结构 期末考试', date: addDaysISO(12), daysLeft: 12 }

// 学习任务
export const initialTasks: StudyTask[] = [
  { id: 'tk1', title: '复习数据结构：图的遍历与最短路', courseId: 'c-ds', estimatedMin: 60, dueDate: addDaysISO(1), priority: 'high', status: 'todo', fromAI: false, createdAt: addDaysISO(-3) },
  { id: 'tk2', title: '完成机器学习第 6 章课后习题', courseId: 'c-ml', estimatedMin: 45, dueDate: todayISO, priority: 'high', status: 'doing', fromAI: false, createdAt: addDaysISO(-2) },
  { id: 'tk3', title: '离散数学：谓词逻辑练习 20 题', courseId: 'c-dm', estimatedMin: 40, dueDate: addDaysISO(2), priority: 'medium', status: 'todo', fromAI: false, createdAt: addDaysISO(-1) },
  { id: 'tk4', title: '整理数据库实验三报告', courseId: 'c-db', estimatedMin: 50, dueDate: addDaysISO(3), priority: 'medium', status: 'todo', fromAI: false, createdAt: addDaysISO(-1) },
  { id: 'tk5', title: '背英语单词 50 个', estimatedMin: 30, dueDate: todayISO, priority: 'low', status: 'done', fromAI: false, createdAt: addDaysISO(-1) },
  { id: 'tk6', title: 'OOP 课程设计：类图绘制', courseId: 'c-oo', estimatedMin: 45, dueDate: addDaysISO(-1), priority: 'high', status: 'done', fromAI: false, createdAt: addDaysISO(-6) },
  { id: 'tk7', title: '数据结构期末·错题复盘（AI 拆解）', courseId: 'c-ds', estimatedMin: 40, dueDate: addDaysISO(5), priority: 'medium', status: 'todo', fromAI: true, createdAt: addDaysISO(-1) },
]

export const notifications: AppNotification[] = [
  { id: 'n1', title: '机器学习出勤率接近警戒线', body: '当前 83%，低于 85% 警戒线将影响平时分，建议本周准时到课。', level: 'risk', date: addDaysISO(0), read: false },
  { id: 'n2', title: '数据结构期末考试还有 12 天', body: '复习任务完成度 40%，建议每天投入 60 分钟。', level: 'warn', date: addDaysISO(0), read: false },
  { id: 'n3', title: '课程表冲突已检测', body: '周三下午"数据结构辅导课"与"机器学习答疑"时间重叠，请查看调整建议。', level: 'warn', date: addDaysISO(-1), read: true },
  { id: 'n4', title: '面向对象程序设计期中成绩公布', body: '恭喜！95 分，位列班级前 5%。', level: 'info', date: addDaysISO(-2), read: true },
]

export const initialConversations: AIConversation[] = [
  {
    id: 'conv-demo',
    title: '本周学习安排',
    createdAt: addDaysISO(-1),
    messages: [
      { id: 'm1', role: 'user', content: '帮我看看这周复习重点是什么？', time: '09:30' },
      { id: 'm2', role: 'assistant', time: '09:30', content: '根据你的课程数据：数据结构期末考试还有 12 天，而你的期中成绩（78 分）低于其他科目，建议本周优先复习图的遍历与最短路径部分。机器学习出勤率 83% 接近警戒线，本周需保持全勤。',
        actions: [{ label: '打开今天课表', to: '/timetable' }, { label: '查看学业表现', to: '/grades' }] },
    ],
  },
]

// 职业探索演示数据
export const careerProfiles = [
  { id: 'ml-eng', name: '机器学习工程师', match: 88, desc: '与你的机器学习、数据结构课程匹配度高，适合继续深入算法与工程实践。' },
  { id: 'backend', name: '后端开发工程师', match: 82, desc: '数据库原理与面向对象课程表现优秀，是稳妥的就业方向。' },
  { id: 'data-analyst', name: '数据分析师', match: 74, desc: '离散数学基础扎实，可补充统计学与 SQL 实战技能。' },
]

export const skillRadar = [
  { skill: '编程基础', score: 85, target: 90 },
  { skill: '算法与数据结构', score: 72, target: 85 },
  { skill: '机器学习', score: 78, target: 88 },
  { skill: '数据库', score: 80, target: 82 },
  { skill: '工程实践', score: 65, target: 80 },
  { skill: '数学基础', score: 88, target: 88 },
]
