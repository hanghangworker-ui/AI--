// 后端冒烟测试：node --experimental-sqlite scripts/smoke.js
// 覆盖：health → 登录 → overview(87%出勤口径) → sync写回 → AI代理问答 → 注册 → 清理
import { all, run } from '../src/db.js'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001'

const ok = (name, pass, detail = '') => {
  if (!pass) failed++
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? '  ' + detail : ''}`)
}

let token = ''
let failed = 0

const api = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const main = async () => {
  // 1. health
  let r = await api('/api/health')
  ok('GET /api/health', r.status === 200 && r.data?.ok, JSON.stringify(r.data))

  // 2. 登录（错误密码 → 401）
  r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ studentNo: 'ST2026001', password: 'wrong' }) })
  ok('登录·错误密码被拒绝 (401)', r.status === 401)

  r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ studentNo: 'ST2026001', password: 'demo123' }) })
  token = r.data?.token || ''
  ok('登录·JWT 签发', r.status === 200 && token.length > 20, `token=${token.slice(0, 16)}…`)

  // 3. 未带 token → 401
  const saved = token; token = ''
  r = await api('/api/student/overview')
  ok('未授权访问被拦截 (401)', r.status === 401)
  token = saved

  // 4. overview：87% 出勤率口径 + 机器学习 83%
  r = await api('/api/student/overview')
  const s = r.data?.summary
  ok('GET /overview 数据完整', r.status === 200 && Array.isArray(r.data?.tasks) && Array.isArray(r.data?.timetable))
  ok('总体出勤率 = 87%（计划书口径）', s?.attendanceRate === 87, `实际 ${s?.attendanceRate}%`)
  const mlRisk = s?.risks?.find(x => x.courseId === 'c-ml')
  ok('机器学习风险课 = 83%（低于警戒线）', mlRisk?.rate === 83 && mlRisk?.level === 'below', JSON.stringify(s?.risks))
  ok('健康度评分 0-100', typeof s?.health?.total === 'number' && s.health.total >= 0 && s.health.total <= 100, `${s?.health?.total} 分`)

  // 5. sync 写回：完成任务 tk1 → SQLite 持久化
  const tasks = r.data.tasks
  const patched = tasks.map(t => t.id === 'tk1' ? { ...t, status: 'done' } : t)
  r = await api('/api/sync/tasks', { method: 'POST', body: JSON.stringify({ tasks: patched }) })
  ok('POST /sync/tasks 写回', r.status === 200 && r.data?.ok)

  r = await api('/api/student/overview')
  const tk1 = r.data?.tasks?.find(t => t.id === 'tk1')
  ok('写回持久化：tk1 状态 = done', tk1?.status === 'done')

  // 还原（避免污染演示数据）
  const restored = r.data.tasks.map(t => t.id === 'tk1' ? { ...t, status: 'todo' } : t)
  await api('/api/sync/tasks', { method: 'POST', body: JSON.stringify({ tasks: restored }) })

  // 6. AI 代理：考勤问答（数据来自 SQLite，遵守 grants）
  r = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ question: '我的出勤率怎么样？', provider: 'builtin' }) })
  ok('AI 代理·考勤问答', r.status === 200 && r.data?.content?.includes('87'), (r.data?.content || '').slice(0, 50))

  // 7. 数据授权关闭后，AI 拒绝读考勤
  await api('/api/student/settings', { method: 'PUT', body: JSON.stringify({ grants: { attendance: false } }) })
  r = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ question: '我的出勤率怎么样？', provider: 'builtin' }) })
  ok('关闭授权后 AI 拒答考勤', r.status === 200 && r.data?.content?.includes('授权'))
  await api('/api/student/settings', { method: 'PUT', body: JSON.stringify({ grants: { attendance: true } }) })

  // 8. 注册：新学号 + 导入演示数据 → 201 注册即登录
  const liMingToken = token
  r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ studentNo: 'SMOKE-REG-001', name: '冒烟一号', password: 'test123', withDemoData: true }) })
  const regToken = r.data?.token || ''
  ok('注册·新学号返回 201 + token', r.status === 201 && regToken.length > 20)

  // 重复注册同学号 → 409
  r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ studentNo: 'SMOKE-REG-001', name: '冒烟一号', password: 'test123' }) })
  ok('注册·重复学号返回 409', r.status === 409, r.data?.message || '')

  // 密码过短 → 400
  r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ studentNo: 'SMOKE-REG-003', name: '冒烟三号', password: '123' }) })
  ok('注册·密码过短返回 400', r.status === 400)

  // 9. 注册学生（演示数据已复制）：overview 口径与李明一致
  token = regToken
  r = await api('/api/student/overview')
  ok('注册学生·演示数据已复制（课表+考勤87%）',
    r.status === 200 && r.data?.summary?.attendanceRate === 87 && (r.data?.timetable?.length || 0) > 0,
    `出勤 ${r.data?.summary?.attendanceRate}% / 课表 ${r.data?.timetable?.length} 条`)
  ok('注册学生·历史档案 histGpa=8.0 / histCredits=0',
    r.data?.student?.histGpa === 8.0 && r.data?.student?.histCredits === 0)

  // 10. 空数据学生（不导入演示数据）：summary 不出现 NaN
  r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ studentNo: 'SMOKE-REG-002', name: '冒烟二号', password: 'test123', withDemoData: false }) })
  token = r.data?.token
  r = await api('/api/student/overview')
  const es = r.data?.summary
  ok('空数据学生·summary 无 NaN（sgpa=cgpa=0）',
    r.status === 200 && es?.sgpa === 0 && es?.cgpa === 0 && typeof es?.health?.total === 'number',
    `sgpa=${es?.sgpa} cgpa=${es?.cgpa} health=${es?.health?.total}`)
  r = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ question: '我的出勤率怎么样？', provider: 'builtin' }) })
  ok('空数据学生·AI 问答不崩', r.status === 200 && typeof r.data?.content === 'string', (r.data?.content || '').slice(0, 40))

  // 11. 清理冒烟测试学生（保留演示学生 stu-001）
  for (const row of all("SELECT id FROM students WHERE student_no LIKE 'SMOKE-REG-%'")) {
    run('DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE student_id = ?)', row.id)
    for (const tb of ['conversations', 'timetable', 'attendance', 'exam_results', 'tasks', 'notifications', 'course_grades']) {
      run(`DELETE FROM ${tb} WHERE student_id = ?`, row.id)
    }
    run('DELETE FROM students WHERE id = ?', row.id)
  }
  const remain = all("SELECT COUNT(*) AS c FROM students WHERE student_no LIKE 'SMOKE-REG-%'")[0].c
  ok('清理冒烟测试学生数据', remain === 0)
  token = liMingToken

  // 12. 静态托管前端
  const page = await fetch(`${BASE}/`)
  const html = await page.text()
  ok('静态托管前端 dist', page.status === 200 && html.includes('CampusFlow'))

  console.log(failed ? '\n存在失败项' : '\n🎉 全部通过')
}

main().catch(e => { console.error('❌ 冒烟脚本异常:', e.message); process.exit(1) })
