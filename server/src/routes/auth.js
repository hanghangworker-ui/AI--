// 登录/注册路由：POST /api/auth/login、POST /api/auth/register、GET /api/auth/me
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { get, run, all, uid } from '../db.js'
import { signToken, requireAuth } from '../auth.js'

const router = Router()

// ---------- 演示学生（数据模板来源） ----------
const DEMO_STUDENT_ID = 'stu-001'

/** 复制演示学生的课表/考勤/成绩/任务/通知/会话到新学生（快速体验完整功能） */
function copyDemoData(fromId, toId) {
  const map = [
    ['timetable', ['id', 'student_id', 'course_id', 'day', 'start_min', 'end_min', 'room', 'kind', 'status', 'conflict_with', 'alt_json']],
    ['attendance', ['id', 'student_id', 'course_id', 'date', 'status']],
    ['exam_results', ['id', 'student_id', 'course_id', 'title', 'score', 'date', 'weight']],
    ['tasks', ['id', 'student_id', 'title', 'course_id', 'estimated_min', 'due_date', 'priority', 'status', 'from_ai', 'created_at']],
    ['notifications', ['id', 'student_id', 'title', 'body', 'level', 'date', 'read']],
  ]
  for (const [table, cols] of map) {
    const rows = all(`SELECT * FROM ${table} WHERE student_id = ?`, fromId)
    for (const r of rows) {
      const placeholders = cols.map(() => '?').join(',')
      const values = cols.map(c => c === 'id' ? uid('cp-') : (c === 'student_id' ? toId : r[c]))
      run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, ...values)
    }
  }
  // 成绩表（复合主键）
  for (const r of all('SELECT * FROM course_grades WHERE student_id = ?', fromId)) {
    run('INSERT OR REPLACE INTO course_grades (student_id, course_id, current_score, trend) VALUES (?,?,?,?)',
      toId, r.course_id, r.current_score, r.trend)
  }
  // 会话 + 消息
  for (const c of all('SELECT * FROM conversations WHERE student_id = ?', fromId)) {
    const newCid = uid('conv-')
    run('INSERT INTO conversations (id, student_id, title, created_at) VALUES (?,?,?,?)', newCid, toId, c.title, c.created_at)
    for (const m of all('SELECT * FROM chat_messages WHERE conversation_id = ?', c.id)) {
      run('INSERT INTO chat_messages VALUES (?,?,?,?,?,?,?,?)',
        uid('m-'), newCid, m.role, m.content, m.time, m.actions_json, m.data_used_json, m.fallback)
    }
  }
}

router.post('/register', (req, res) => {
  const { studentNo, name, password, withDemoData } = req.body || {}
  const no = String(studentNo || '').trim()
  const nick = String(name || '').trim()

  // ---------- 校验 ----------
  if (!no || !nick || !password) {
    return res.status(400).json({ error: 'bad_request', message: '学号、姓名和密码均为必填' })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'bad_request', message: '密码至少 6 位' })
  }
  if (get('SELECT id FROM students WHERE student_no = ?', no)) {
    return res.status(409).json({ error: 'conflict', message: '该学号已注册，请直接登录' })
  }

  // ---------- 建号 ----------
  const id = uid('stu-')
  run(`INSERT INTO students (id, name, student_no, password_hash, grade, major, email, hist_gpa, hist_credits, grants, notif_prefs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id, nick, no, bcrypt.hashSync(String(password), 10),
    '大一', '计算机科学与技术', `${no.toLowerCase()}@stu.czu.edu.cn`,
    8.0, 0,
    JSON.stringify({ timetable: true, attendance: true, grades: true, tasks: true }),
    JSON.stringify({ risk: true, exam: true, daily: false }))

  // ---------- 可选：导入演示数据（快速体验完整功能） ----------
  if (withDemoData !== false && get('SELECT id FROM students WHERE id = ?', DEMO_STUDENT_ID)) {
    try { copyDemoData(DEMO_STUDENT_ID, id) } catch { /* 复制失败不影响注册 */ }
  }

  // ---------- 注册即登录 ----------
  const stu = get('SELECT * FROM students WHERE id = ?', id)
  res.status(201).json({
    token: signToken(stu),
    student: { id: stu.id, name: stu.name, studentNo: stu.student_no, grade: stu.grade, major: stu.major, email: stu.email },
  })
})

router.post('/login', (req, res) => {
  const { studentNo, password } = req.body || {}
  if (!studentNo || !password) {
    return res.status(400).json({ error: 'bad_request', message: '请输入学号和密码' })
  }
  const stu = get('SELECT * FROM students WHERE student_no = ?', String(studentNo).trim())
  if (!stu || !bcrypt.compareSync(String(password), stu.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: '学号或密码不正确' })
  }
  res.json({
    token: signToken(stu),
    student: {
      id: stu.id, name: stu.name, studentNo: stu.student_no,
      grade: stu.grade, major: stu.major, email: stu.email,
      histGpa: stu.hist_gpa, histCredits: stu.hist_credits,
    },
  })
})

router.get('/me', requireAuth, (req, res) => {
  const stu = get('SELECT * FROM students WHERE id = ?', req.studentId)
  if (!stu) return res.status(404).json({ error: 'not_found', message: '学生不存在' })
  res.json({
    id: stu.id, name: stu.name, studentNo: stu.student_no,
    grade: stu.grade, major: stu.major, email: stu.email,
    grants: JSON.parse(stu.grants || '{}'),
    notifPrefs: JSON.parse(stu.notif_prefs || '{}'),
  })
})

export default router
