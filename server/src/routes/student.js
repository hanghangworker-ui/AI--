// 学生数据路由：GET /api/student/overview（全量数据+计算摘要）、conversations、settings
import { Router } from 'express'
import { all, get, run } from '../db.js'
import { requireAuth } from '../auth.js'
import {
  overallAttendanceRate, computeSGPA, computeCGPA,
  computeHealthScore, attendanceRisks, studyStreak,
} from '../calc.js'

const router = Router()
router.use(requireAuth)

// ---------- 数据装配（与前端 types 形状一致） ----------
function assembleOverview(studentId) {
  const stu = get('SELECT * FROM students WHERE id = ?', studentId)
  const student = {
    id: stu.id, name: stu.name, studentNo: stu.student_no, grade: stu.grade,
    major: stu.major, email: stu.email, avatarColor: 'bg-indigo-500',
    histGpa: stu.hist_gpa, histCredits: stu.hist_credits,
  }
  const courses = all('SELECT * FROM courses')
  const timetable = all('SELECT * FROM timetable WHERE student_id = ? ORDER BY day, start_min', studentId)
    .map(r => ({
      id: r.id, courseId: r.course_id, day: r.day, startMin: r.start_min, endMin: r.end_min,
      room: r.room, kind: r.kind, status: r.status,
      conflictWith: r.conflict_with || undefined,
      alternative: r.alt_json ? JSON.parse(r.alt_json) : undefined,
    }))
  const attendance = all('SELECT * FROM attendance WHERE student_id = ? ORDER BY date', studentId)
    .map(r => ({ id: r.id, courseId: r.course_id, date: r.date, status: r.status }))
  const examResults = all('SELECT * FROM exam_results WHERE student_id = ? ORDER BY date DESC', studentId)
    .map(r => ({ id: r.id, courseId: r.course_id, title: r.title, score: r.score, date: r.date, weight: r.weight }))
  const courseGrades = all(`SELECT g.*, c.name AS course_name FROM course_grades g
                            JOIN courses c ON c.id = g.course_id WHERE g.student_id = ?`, studentId)
    .map(r => ({
      courseId: r.course_id, currentScore: r.current_score, trend: r.trend,
      history: examResults.filter(e => e.courseId === r.course_id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(e => ({ title: e.title, score: e.score, date: e.date })),
    }))
  const tasks = all('SELECT * FROM tasks WHERE student_id = ?', studentId)
    .map(r => ({
      id: r.id, title: r.title, courseId: r.course_id || undefined, estimatedMin: r.estimated_min,
      dueDate: r.due_date, priority: r.priority, status: r.status,
      fromAI: !!r.from_ai, createdAt: r.created_at,
    }))
  const notifications = all('SELECT * FROM notifications WHERE student_id = ? ORDER BY date DESC', studentId)
    .map(r => ({ id: r.id, title: r.title, body: r.body, level: r.level, date: r.date, read: !!r.read }))
  const conversationRows = all('SELECT * FROM conversations WHERE student_id = ? ORDER BY created_at DESC', studentId)
  const conversations = conversationRows.map(c => ({
    id: c.id, title: c.title, createdAt: c.created_at,
    messages: all('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY rowid', c.id).map(m => ({
      id: m.id, role: m.role, content: m.content, time: m.time,
      actions: m.actions_json ? JSON.parse(m.actions_json) : undefined,
      dataUsed: m.data_used_json ? JSON.parse(m.data_used_json) : undefined,
      fallback: !!m.fallback,
    })),
  }))

  return {
    student, courses, timetable, attendance, examResults, courseGrades,
    tasks, notifications, conversations,
    summary: {
      attendanceRate: overallAttendanceRate(studentId),
      sgpa: computeSGPA(studentId),
      cgpa: computeCGPA(studentId),
      health: computeHealthScore(studentId),
      risks: attendanceRisks(studentId),
      streak: studyStreak(studentId),
      grants: JSON.parse(stu.grants || '{}'),
      notifPrefs: JSON.parse(stu.notif_prefs || '{}'),
    },
  }
}

router.get('/overview', (req, res) => {
  res.json(assembleOverview(req.studentId))
})

router.put('/settings', (req, res) => {
  const { grants, notifPrefs } = req.body || {}
  if (grants) run('UPDATE students SET grants = ? WHERE id = ?', JSON.stringify(grants), req.studentId)
  if (notifPrefs) run('UPDATE students SET notif_prefs = ? WHERE id = ?', JSON.stringify(notifPrefs), req.studentId)
  res.json({ ok: true })
})

export default router
