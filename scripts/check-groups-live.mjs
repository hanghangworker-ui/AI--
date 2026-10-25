// 用真实后端数据验证任务分组：登录 → 拉 overview → 套用新分组逻辑
const BASE = 'http://127.0.0.1:3001'

const api = async (path, options = {}, token = '') => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  return { status: res.status, data: await res.json().catch(() => null) }
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = iso(new Date())

const main = async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ studentNo: 'ST2026001', password: 'demo123' }),
  })
  if (login.status !== 200) throw new Error('登录失败')
  const token = login.data.token

  const ov = await api('/api/student/overview', {}, token)
  if (ov.status !== 200) throw new Error('overview 失败')
  const tasks = ov.data.tasks

  const isOverdue = (d) => d < todayISO
  const groups = [
    { key: '今日任务', items: tasks.filter((x) => x.status !== 'done' && x.dueDate <= todayISO) },
    { key: '进行中', items: tasks.filter((x) => x.status === 'doing' && x.dueDate > todayISO) },
    { key: '计划中', items: tasks.filter((x) => x.status === 'todo' && x.dueDate > todayISO) },
    { key: '已完成', items: tasks.filter((x) => x.status === 'done') },
  ]

  console.log('今天:', todayISO, '| 数据库任务数:', tasks.length)
  console.log('')
  let sum = 0
  for (const g of groups) {
    console.log(`${g.key}: ${g.items.length}`)
    for (const it of g.items) {
      const flag = isOverdue(it.dueDate) ? ' [逾期]' : ''
      console.log(`   - ${it.id} ${it.status.padEnd(5)} ${it.dueDate} ${it.title.slice(0, 22)}${flag}`)
    }
    sum += g.items.length
  }
  const ids = groups.flatMap((g) => g.items.map((i) => i.id))
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
  console.log('')
  console.log('分组累计:', sum, '| 丢失:', tasks.length - sum, '| 重复:', dup.length)
  console.log(tasks.length === sum && dup.length === 0 ? 'PASS 全部任务均可见' : 'FAIL 仍有任务丢失')

  // 旧逻辑对照
  const oldSum = [
    tasks.filter((x) => x.status !== 'done' && x.dueDate <= todayISO),
    tasks.filter((x) => x.status === 'doing'),
    tasks.filter((x) => x.status === 'done'),
  ].reduce((s, g) => s + g.length, 0)
  console.log('旧逻辑可见:', oldSum, '/', tasks.length, '-> 隐藏', tasks.length - oldSum, '条')
}

main().catch((e) => {
  console.error('异常:', e.message)
  process.exit(1)
})
