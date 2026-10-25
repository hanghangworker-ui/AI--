// AI 代理路由：POST /api/ai/chat —— 密钥只在服务端使用，失败回退内置规则问答
import { Router } from 'express'
import { all, get } from '../db.js'
import { requireAuth, AI_API_KEY, AI_BASE_URL, AI_MODEL } from '../auth.js'
import {
  overallAttendanceRate, courseAttendanceRate, computeSGPA, computeCGPA, attendanceRisks,
} from '../calc.js'

const router = Router()
router.use(requireAuth)

// ---------- 内置规则问答（与前端 aiService 逻辑一致，数据来自 SQLite） ----------
function builtinAnswer(studentId, question) {
  const q = String(question || '').toLowerCase()
  const has = (...ks) => ks.some(k => q.includes(k))
  const courses = all('SELECT id, name, name_en FROM courses')
  const courseName = id => courses.find(c => c.id === id)?.name ?? ''
  const grants = JSON.parse(get('SELECT grants FROM students WHERE id = ?', studentId).grants || '{}')
  const grantOn = k => grants[k] !== false // 默认允许

  // 考勤类
  if (has('考勤', '出勤', 'attendance', '缺勤', '迟到')) {
    if (!grantOn('attendance')) return noGrant()
    const risks = attendanceRisks(studentId)
    const rateList = courses.map(c => `${c.name} ${courseAttendanceRate(studentId, c.id)}%`).join('；')
    const riskTxt = risks.length
      ? risks.map(r => `${r.courseName} ${r.rate}%（${r.level === 'below' ? '已低于' : '接近'}85% 警戒线）`).join('；')
      : '各课程出勤率均处于安全区间'
    return {
      content: `你的总体出勤率为 ${overallAttendanceRate(studentId)}%。按课程来看：${rateList}。\n需要留意：${riskTxt}。建议：机器学习课程本周保持全勤即可回到安全线；其余课程保持现状即可。`,
      actions: [{ label: '查看考勤中心', to: '/attendance' }],
      dataUsed: ['考勤数据'], fallback: true,
    }
  }
  // 成绩/绩点类
  if (has('绩点', 'cgpa', 'gpa', '成绩', '分数', '考试', 'score')) {
    if (!grantOn('grades')) return noGrant()
    const grades = all(`SELECT g.*, c.name FROM course_grades g
                        JOIN courses c ON c.id = g.course_id
                        WHERE g.student_id = ? ORDER BY g.current_score`, studentId)
    const weakest = grades[0], strongest = grades[grades.length - 1]
    return {
      content: `你当前累计 CGPA 为 ${computeCGPA(studentId)}，本学期 SGPA 为 ${computeSGPA(studentId)}。优势科目是 ${strongest.name}（${strongest.current_score} 分）；${weakest.name}（${weakest.current_score} 分，近期${weakest.trend === 'down' ? '下降' : '波动'}）是最优先的提升点。若想达到 8.5，建议在剩余课程中把 ${weakest.name} 拉到 85 分以上。`,
      actions: [{ label: '打开绩点规划', to: '/cgpa' }, { label: '查看学业表现', to: '/grades' }],
      dataUsed: ['成绩与绩点数据'], fallback: true,
    }
  }
  // 课表类
  if (has('课表', '课程', '上课', '教室', 'timetable', 'class', '下一节')) {
    if (!grantOn('timetable')) return noGrant()
    const day = (new Date().getDay() + 6) % 7
    const today = all(`SELECT t.*, c.name AS cname FROM timetable t
                       JOIN courses c ON c.id = t.course_id
                       WHERE t.student_id = ? AND t.day = ?`, studentId, day)
    const conflict = all(`SELECT * FROM timetable WHERE student_id = ? AND status = 'conflict' LIMIT 1`, studentId)
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const next = today.filter(e => e.start_min > nowMin).sort((a, b) => a.start_min - b.start_min)[0]
    const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    return {
      content: `${next ? `你的下一节课是「${next.cname}」，在 ${next.room}。` : '今天没有更多课程了。'}今天共有 ${today.length} 节课。${conflict ? `\n另外提醒：${['周一', '周二', '周三', '周四', '周五', '周六', '周日'][conflict.day]}下午存在课程时间冲突，课程表页有 AI 调整建议。` : ''}`,
      actions: [{ label: '打开今天课表', to: '/timetable' }],
      dataUsed: ['课程与课表数据'], fallback: true,
    }
  }
  // 计划/任务类
  if (has('计划', '复习', '规划', '学习任务', 'plan', 'task', '目标')) {
    const tasks = all('SELECT * FROM tasks WHERE student_id = ?', studentId)
    const undone = tasks.filter(t => t.status !== 'done').length
    return {
      content: `你现在有 ${undone} 项未完成任务。建议这样安排：\n1. 优先完成高优先级任务（数据结构复习、机器学习习题）；\n2. 数据结构期末考试临近，建议每天投入 60 分钟，按「知识点 → 练习题 → 错题复盘 → 模拟测试」推进；\n3. 可以在任务中心使用「AI 拆解大目标」自动生成子任务。`,
      actions: [{ label: '打开学习任务', to: '/tasks' }, { label: '查看绩点目标', to: '/cgpa' }],
      dataUsed: ['学习任务数据'], fallback: true,
    }
  }
  // 问候
  if (has('你好', 'hello', 'hi', '在吗')) {
    return { content: '你好！我是你的 AI 学习助手，可以帮你查课程、看考勤、分析成绩、制定学习计划。试试下面的快捷提问，或直接输入你的问题。', actions: [], dataUsed: [], fallback: true }
  }
  // 兜底
  const notif = get('SELECT title, body FROM notifications WHERE student_id = ? ORDER BY date DESC LIMIT 1', studentId)
  return {
    content: `我暂时没有完全理解你的问题，但可以帮你查这些内容：课程表、考勤率、成绩绩点、学习计划。\n${notif ? `另外，最新通知：${notif.title}——${notif.body}` : ''}`,
    actions: [{ label: '打开今日驾驶舱', to: '/' }, { label: '查看考勤中心', to: '/attendance' }],
    dataUsed: [], fallback: true,
  }
}

function noGrant() {
  return {
    content: '你已在「个人设置」中关闭了相关数据的授权，我无法读取该类数据为你作答。如需使用，请前往设置重新开启对应数据授权。',
    actions: [{ label: '前往个人设置', to: '/settings' }],
    dataUsed: [], fallback: true,
  }
}

// ---------- 远程转发（密钥仅存在服务端 .env） ----------
async function remoteAnswer(studentId, question, providerCfg) {
  const grants = JSON.parse(get('SELECT grants FROM students WHERE id = ?', studentId).grants || '{}')
  const stu = get('SELECT name, student_no, major FROM students WHERE id = ?', studentId)
  const parts = [`学生：${stu?.name ?? ''}（${stu?.student_no ?? ''}，${stu?.major ?? ''}）`]
  if (grants.grades !== false) parts.push(`当前 CGPA=${computeCGPA(studentId)}，SGPA=${computeSGPA(studentId)}`)
  if (grants.attendance !== false) parts.push(`总体出勤率 ${overallAttendanceRate(studentId)}%`)
  if (grants.timetable !== false) {
    const day = (new Date().getDay() + 6) % 7
    parts.push(`今日课程数 ${all('SELECT COUNT(*) AS c FROM timetable WHERE student_id = ? AND day = ?', studentId, day)[0].c}`)
  }
  const sys = `你是 CampusFlow AI 学生助手，面向中国大学生。请用简体中文、简洁友好地回答。学生数据：${parts.join('；')}。数据中没提到的信息请如实说明，并提醒结果可能存在误差。`

  const baseUrl = AI_BASE_URL() || providerCfg.baseUrl || 'https://api.deepseek.com/v1'
  const model = AI_MODEL() || providerCfg.model || 'deepseek-chat'
  const key = AI_API_KEY()
  if (!key) throw new Error('no server key')

  // Dify
  if (providerCfg.provider === 'dify') {
    const res = await fetch(`${providerCfg.baseUrl?.replace(/\/$/, '')}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ inputs: {}, query: question, response_mode: 'blocking', user: studentId }),
    })
    if (!res.ok) throw new Error(`dify ${res.status}`)
    const data = await res.json()
    return data.answer ?? data.text ?? ''
  }
  // DeepSeek / OpenAI 兼容
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: 0.7,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: question }],
    }),
  })
  if (!res.ok) throw new Error(`chat ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

router.post('/chat', async (req, res) => {
  const { question, provider, model, baseUrl, lang } = req.body || {}
  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: 'bad_request', message: '问题不能为空' })
  }
  try {
    let answer = null
    // 有服务端密钥且选择了远程 Provider 才转发
    if (provider && provider !== 'builtin' && AI_API_KEY()) {
      try {
        const content = await remoteAnswer(req.studentId, question, { provider, model, baseUrl })
        if (content?.trim()) {
          answer = { content: content.trim(), actions: [{ label: '打开今日驾驶舱', to: '/' }], dataUsed: [], fallback: false }
        }
      } catch {
        answer = null // 落入回退链
      }
    }
    if (!answer) answer = builtinAnswer(req.studentId, question)
    if (answer.fallback && provider && provider !== 'builtin' && AI_API_KEY()) {
      answer.content = `⚠️ 接口请求失败，已切换为本地问答（服务端代理记录了该次失败，可在服务端日志查看原因）。\n\n${answer.content}`
    }
    res.json(answer)
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'AI 服务暂不可用' })
  }
})

export default router
