// 演示数据导入：与前端 Mock 同源（日期相对"今天"动态生成，永远鲜活）
// 用法：npm run seed（--reset 清空重建）；被 index.js import 时空库自动初始化
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { all, get, run } from './db.js'

const pad = n => String(n).padStart(2, '0')
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDaysISO = n => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }

export function seedIfEmpty(RESET = false) {
  const TABLES = ['chat_messages', 'conversations', 'notifications', 'tasks', 'course_grades', 'exam_results', 'attendance', 'timetable', 'courses', 'students']
  if (RESET) {
    for (const t of TABLES) run(`DELETE FROM ${t}`)
    console.log('已清空全部表数据')
  }

  const studentCount = get('SELECT COUNT(*) AS c FROM students').c
  if (studentCount > 0 && !RESET) {
    return false // 已有数据，跳过
  }

// ---------- 学生 ----------
const pwHash = bcrypt.hashSync('demo123', 10)
run(`INSERT OR REPLACE INTO students (id, name, student_no, password_hash, grade, major, email, hist_gpa, hist_credits, grants, notif_prefs)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  'stu-001', '李明', 'ST2026001', pwHash, '大二', '计算机科学与技术', 'liming@stu.czu.edu.cn',
  8.5, 30,
  JSON.stringify({ timetable: 1, attendance: 1, grades: 1, tasks: 1 }),
  JSON.stringify({ risk: 1, exam: 1, daily: 0 }))
const studentId = 'stu-001'

// ---------- 课程 ----------
const courses = [
  ['c-ds', '数据结构', 'Data Structures', '王建国', 4, 'indigo'],
  ['c-dm', '离散数学', 'Discrete Mathematics', '陈静', 3, 'teal'],
  ['c-ml', '机器学习', 'Machine Learning', '刘洋', 4, 'violet'],
  ['c-db', '数据库原理', 'Database Principles', '赵芳', 3.5, 'sky'],
  ['c-oo', '面向对象程序设计', 'OOP Design', '孙伟', 3, 'amber'],
]
for (const c of courses) run('INSERT OR REPLACE INTO courses VALUES (?,?,?,?,?,?)', ...c)

// ---------- 课表（预置周三冲突对 + 替代方案） ----------
const T = (h, m = 0) => h * 60 + m
const alt = { day: 3, startMin: T(16), endMin: T(17, 40), room: '实验楼 C201' }
const timetable = [
  ['tt1', 'c-ds', 0, T(8), T(9, 40), '教学楼 A301', 'lecture', 'normal', null, null],
  ['tt2', 'c-dm', 0, T(10), T(11, 40), '教学楼 B205', 'lecture', 'normal', null, null],
  ['tt3', 'c-oo', 1, T(8), T(9, 40), '实验楼 C102', 'lab', 'normal', null, null],
  ['tt4', 'c-db', 1, T(14), T(15, 40), '教学楼 A505', 'lecture', 'normal', null, null],
  ['tt5', 'c-ml', 2, T(8), T(9, 40), '教学楼 B301', 'lecture', 'normal', null, null],
  ['tt6', 'c-ds', 2, T(14), T(16), '实验楼 C201', 'tutorial', 'conflict', 'tt7', null],
  ['tt7', 'c-ml', 2, T(14), T(15, 40), '教学楼 A203', 'tutorial', 'conflict', 'tt6', alt],
  ['tt8', 'c-dm', 3, T(8), T(9, 40), '教学楼 B205', 'lecture', 'normal', null, null],
  ['tt9', 'c-oo', 3, T(10), T(11, 40), '教学楼 A402', 'lecture', 'normal', null, null],
  ['tt10', 'c-db', 4, T(8), T(9, 40), '实验楼 C305', 'lab', 'normal', null, null],
  ['tt11', 'c-ml', 4, T(10), T(11, 40), '教学楼 B301', 'lecture', 'normal', null, null],
]
for (const [id, cid, day, s, e, room, kind, status, conflict, altJ] of timetable) {
  run(`INSERT OR REPLACE INTO timetable (id, student_id, course_id, day, start_min, end_min, room, kind, status, conflict_with, alt_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id, studentId, cid, day, s, e, room, kind, status, conflict, altJ ? JSON.stringify(altJ) : null)
}

// ---------- 考勤（总体 87%，机器学习 83% 低于警戒线） ----------
const ratios = {
  'c-ds': { present: 15, absent: 3, late: 2 },  // 17/20 = 85%
  'c-dm': { present: 17, absent: 2, late: 1 },  // 18/20 = 90%
  'c-ml': { present: 16, absent: 4, late: 3 },  // 19/23 = 83%（低于警戒线）
  'c-db': { present: 16, absent: 2, late: 2 },  // 18/20 = 90%
  'c-oo': { present: 19, absent: 3, late: 0 },  // 19/22 = 86%
}
let attIdx = 0
for (const [cid, r] of Object.entries(ratios)) {
  const seq = [...Array(r.present).fill('present'), ...Array(r.absent).fill('absent'), ...Array(r.late).fill('late')]
  seq.forEach((st, i) => {
    run('INSERT OR REPLACE INTO attendance VALUES (?,?,?,?,?)', `att-${attIdx++}`, studentId, cid, addDaysISO(-42 + i * 2), st)
  })
}

// ---------- 成绩 ----------
const grades = [
  ['c-ds', 81, 'down', [['平时测验 1', 84, -60, 10], ['期中考试', 78, -25, 30]]],
  ['c-dm', 91, 'up', [['随堂测验', 90, -40, 10], ['期中考试', 92, -22, 30]]],
  ['c-ml', 84, 'down', [['平时测验', 88, -38, 10], ['期中考试', 81, -20, 30]]],
  ['c-db', 88, 'up', [['实验报告评分', 86, -35, 15], ['期中考试', 89, -18, 30]]],
  ['c-oo', 95, 'up', [['编程作业', 94, -30, 15], ['期中考试', 95, -15, 30]]],
]
let exIdx = 0
for (const [cid, score, trend, exams] of grades) {
  run('INSERT OR REPLACE INTO course_grades VALUES (?,?,?,?)', studentId, cid, score, trend)
  for (const [title, s, offset, weight] of exams) {
    run('INSERT OR REPLACE INTO exam_results VALUES (?,?,?,?,?,?,?)', `ex${++exIdx}`, studentId, cid, title, s, addDaysISO(offset), weight)
  }
}

// ---------- 学习任务 ----------
const tasks = [
  ['tk1', '复习数据结构：图的遍历与最短路', 'c-ds', 60, addDaysISO(1), 'high', 'todo', 0],
  ['tk2', '完成机器学习第 6 章课后习题', 'c-ml', 45, addDaysISO(0), 'high', 'doing', 0],
  ['tk3', '离散数学：谓词逻辑练习 20 题', 'c-dm', 40, addDaysISO(2), 'medium', 'todo', 0],
  ['tk4', '整理数据库实验三报告', 'c-db', 50, addDaysISO(3), 'medium', 'todo', 0],
  ['tk5', '背英语单词 50 个', null, 30, addDaysISO(0), 'low', 'done', 0],
  ['tk6', 'OOP 课程设计：类图绘制', 'c-oo', 45, addDaysISO(-1), 'high', 'done', 0],
  ['tk7', '数据结构期末·错题复盘（AI 拆解）', 'c-ds', 40, addDaysISO(5), 'medium', 'todo', 1],
]
for (const [id, title, cid, est, due, pri, status, fromAI] of tasks) {
  run(`INSERT OR REPLACE INTO tasks (id, student_id, title, course_id, estimated_min, due_date, priority, status, from_ai, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`, id, studentId, title, cid, est, due, pri, status, fromAI, addDaysISO(-1))
}

// ---------- 通知 ----------
const notifs = [
  ['n1', '机器学习出勤率接近警戒线', '当前 83%，低于 85% 警戒线将影响平时分，建议本周准时到课。', 'risk', 0, 0],
  ['n2', '数据结构期末考试还有 12 天', '复习任务完成度 40%，建议每天投入 60 分钟。', 'warn', 0, 0],
  ['n3', '课程表冲突已检测', '周三下午"数据结构辅导课"与"机器学习答疑"时间重叠，请查看调整建议。', 'warn', -1, 1],
  ['n4', '面向对象程序设计期中成绩公布', '恭喜！95 分，位列班级前 5%。', 'info', -2, 1],
]
for (const [id, title, body, level, offset, read] of notifs) {
  run('INSERT OR REPLACE INTO notifications VALUES (?,?,?,?,?,?,?)', id, studentId, title, body, level, addDaysISO(offset), read)
}

// ---------- 演示会话 ----------
const convId = 'conv-demo'
run('INSERT OR REPLACE INTO conversations VALUES (?,?,?,?)', convId, studentId, '本周学习安排', addDaysISO(-1))
const msgs = [
  ['m1', 'user', '帮我看看这周复习重点是什么？', '09:30', null, null, 0],
  ['m2', 'assistant', '根据你的课程数据：数据结构期末考试还有 12 天，而你的期中成绩（78 分）低于其他科目，建议本周优先复习图的遍历与最短路径部分。机器学习出勤率 83% 接近警戒线，本周需保持全勤。',
    '09:30', JSON.stringify([{ label: '打开今天课表', to: '/timetable' }, { label: '查看学业表现', to: '/grades' }]), JSON.stringify(['成绩与绩点', '考勤数据']), 0],
]
for (const [id, role, content, time, actions, dataUsed, fallback] of msgs) {
  run('INSERT OR REPLACE INTO chat_messages VALUES (?,?,?,?,?,?,?,?)', id, convId, role, content, time, actions, dataUsed, fallback)
}

console.log('✅ Seed 完成：学生 李明（ST2026001 / demo123），课程 5 门，课表 11 条（含 1 组冲突），考勤 ' + attIdx + ' 条，考试记录 ' + exIdx + ' 条，任务 ' + tasks.length + ' 项，通知 4 条，演示会话 1 个')
  return true
}

// CLI 模式：node src/seed.js [--reset]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedIfEmpty(process.argv.includes('--reset'))
}
