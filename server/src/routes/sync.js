// 数据同步路由：前端写操作全量同步到 SQLite（POST /api/sync/*）
import { Router } from 'express'
import { run, uid } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

// ---------- 任务 ----------
router.post('/tasks', (req, res) => {
  const tasks = req.body?.tasks
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'bad_request', message: 'tasks 必须为数组' })
  const tx = () => {
    run('DELETE FROM tasks WHERE student_id = ?', req.studentId)
    for (const t of tasks) {
      run(`INSERT INTO tasks (id, student_id, title, course_id, estimated_min, due_date, priority, status, from_ai, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
        t.id || uid('tk-'), req.studentId, String(t.title ?? ''), t.courseId ?? null,
        Number(t.estimatedMin) || 30, t.dueDate ?? null,
        ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        ['todo', 'doing', 'done'].includes(t.status) ? t.status : 'todo',
        t.fromAI ? 1 : 0, t.createdAt ?? new Date().toISOString())
    }
  }
  tx()
  res.json({ ok: true, count: tasks.length })
})

// ---------- 课表（接受冲突调整后同步） ----------
router.post('/timetable', (req, res) => {
  const tt = req.body?.timetable
  if (!Array.isArray(tt)) return res.status(400).json({ error: 'bad_request', message: 'timetable 必须为数组' })
  const tx = () => {
    run('DELETE FROM timetable WHERE student_id = ?', req.studentId)
    for (const e of tt) {
      run(`INSERT INTO timetable (id, student_id, course_id, day, start_min, end_min, room, kind, status, conflict_with, alt_json)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        e.id || uid('tt-'), req.studentId, String(e.courseId ?? ''),
        Number(e.day) || 0, Number(e.startMin) || 0, Number(e.endMin) || 0,
        e.room ?? '', e.kind ?? 'lecture', e.status ?? 'normal',
        e.conflictWith ?? null, e.alternative ? JSON.stringify(e.alternative) : null)
    }
  }
  tx()
  res.json({ ok: true, count: tt.length })
})

// ---------- 通知 ----------
router.post('/notifications', (req, res) => {
  const ns = req.body?.notifications
  if (!Array.isArray(ns)) return res.status(400).json({ error: 'bad_request', message: 'notifications 必须为数组' })
  run('DELETE FROM notifications WHERE student_id = ?', req.studentId)
  for (const n of ns) {
    run('INSERT INTO notifications VALUES (?,?,?,?,?,?,?)',
      n.id || uid('n-'), req.studentId, String(n.title ?? ''), String(n.body ?? ''),
      ['info', 'warn', 'risk'].includes(n.level) ? n.level : 'info', n.date ?? '', n.read ? 1 : 0)
  }
  res.json({ ok: true, count: ns.length })
})

// ---------- 会话 ----------
router.post('/conversations', (req, res) => {
  const convos = req.body?.conversations
  if (!Array.isArray(convos)) return res.status(400).json({ error: 'bad_request', message: 'conversations 必须为数组' })
  run('DELETE FROM conversations WHERE student_id = ?', req.studentId)
  run('DELETE FROM chat_messages WHERE conversation_id NOT IN (SELECT id FROM conversations)')
  for (const c of convos) {
    const cid = c.id || uid('conv-')
    run('INSERT INTO conversations VALUES (?,?,?,?)', cid, req.studentId, String(c.title ?? ''), c.createdAt ?? new Date().toISOString())
    for (const m of c.messages ?? []) {
      run('INSERT INTO chat_messages VALUES (?,?,?,?,?,?,?,?)',
        m.id || uid('m-'), cid, m.role === 'assistant' ? 'assistant' : 'user',
        String(m.content ?? ''), m.time ?? '', JSON.stringify(m.actions ?? null),
        JSON.stringify(m.dataUsed ?? null), m.fallback ? 1 : 0)
    }
  }
  res.json({ ok: true, count: convos.length })
})

export default router
