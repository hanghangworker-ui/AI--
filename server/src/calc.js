// 学业计算（服务端版）：出勤率 / 绩点 / 健康度 / 风险 —— 与前端逻辑保持一致
import { all, get } from './db.js'

export function courseAttendanceRate(studentId, courseId) {
  const recs = all('SELECT status FROM attendance WHERE student_id = ? AND course_id = ?', studentId, courseId)
  if (!recs.length) return 100
  const present = recs.filter(r => r.status !== 'absent').length
  return Math.round((present / recs.length) * 100)
}

export function overallAttendanceRate(studentId) {
  const row = get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status != 'absent' THEN 1 ELSE 0 END) AS present
                   FROM attendance WHERE student_id = ?`, studentId)
  return row.total ? Math.round((row.present / row.total) * 100) : 100
}

export function scoreToGP(score) {
  if (score >= 90) return 10
  if (score >= 80) return 9
  if (score >= 70) return 8
  if (score >= 60) return 6.5
  return 0
}

export function computeSGPA(studentId) {
  const rows = all(`SELECT g.course_id, g.current_score, c.credits FROM course_grades g
                    JOIN courses c ON c.id = g.course_id WHERE g.student_id = ?`, studentId)
  const totalCredit = rows.reduce((s, r) => s + r.credits, 0)
  if (totalCredit === 0) return 0 // 新注册学生暂无成绩
  const weighted = rows.reduce((s, r) => s + scoreToGP(r.current_score) * r.credits, 0)
  return Math.round((weighted / totalCredit) * 100) / 100
}

export function computeCGPA(studentId) {
  const stu = get('SELECT hist_gpa, hist_credits FROM students WHERE id = ?', studentId)
  const rows = all(`SELECT g.current_score, c.credits FROM course_grades g
                    JOIN courses c ON c.id = g.course_id WHERE g.student_id = ?`, studentId)
  const nowCredits = rows.reduce((s, r) => s + r.credits, 0)
  const sgpa = computeSGPA(studentId)
  const totalCredits = (stu.hist_credits || 0) + nowCredits
  if (totalCredits === 0) return 0 // 新注册学生：无历史学分且暂无成绩
  return Math.round(((stu.hist_gpa * stu.hist_credits + sgpa * nowCredits) / totalCredits) * 100) / 100
}

/** 学习健康度 0-100 + 评分依据（考勤30/成绩30/任务20/负荷20） */
export function computeHealthScore(studentId) {
  const att = overallAttendanceRate(studentId)
  const attScore = Math.min(100, Math.round(att / 0.95))

  const grades = all('SELECT current_score, trend FROM course_grades WHERE student_id = ?', studentId)
  const avgScore = grades.length ? grades.reduce((s, g) => s + g.current_score, 0) / grades.length : 0
  const trendMod = grades.reduce((s, g) => s + (g.trend === 'up' ? 4 : g.trend === 'down' ? -5 : 0), 0)
  const gradeScore = Math.max(0, Math.min(100, Math.round(avgScore + trendMod)))

  const tasks = all('SELECT status FROM tasks WHERE student_id = ?', studentId)
  const doneRate = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0

  const ttCount = all('SELECT COUNT(*) AS c FROM timetable WHERE student_id = ?', studentId)[0].c
  const weekHours = ttCount * 2
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

/** 考勤风险课程（<85 低于 / <88 接近） */
export function attendanceRisks(studentId) {
  const courses = all('SELECT id, name FROM courses')
  return courses
    .map(c => ({ courseId: c.id, courseName: c.name, rate: courseAttendanceRate(studentId, c.id) }))
    .filter(r => r.rate < 88)
    .map(r => ({ ...r, level: r.rate < 85 ? 'below' : 'near' }))
}

/** 连续学习天数 */
export function studyStreak(studentId) {
  const days = all(`SELECT DISTINCT due_date AS d FROM tasks WHERE student_id = ? AND status = 'done'`, studentId).map(r => r.d)
  const set = new Set(days)
  let streak = 0
  const d = new Date()
  while (streak < 60) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (set.has(iso)) { streak++; d.setDate(d.getDate() - 1) } else break
  }
  return streak
}
