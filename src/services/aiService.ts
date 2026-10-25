// AI 服务：统一 Provider 接口 + 内置中文规则问答回退
import type { AIProviderConfig, ChatAction } from '../types'
import {
  getCourses, courseById, getTimetable, nextClass, overallAttendanceRate,
  courseAttendanceRate, attendanceRisks, computeSGPA, computeCGPA, getCourseGrades,
  getTasks, getNotifications,
} from './studentService'
import { toISO, todayISO } from '../data/mockData'

export interface AIAnswer {
  content: string
  actions: ChatAction[]
  dataUsed: string[] // 引用的数据类别
  fallback: boolean // 是否本地回退
}

export interface AIContext {
  lang: 'zh' | 'en'
}

// ---------- 上下文组装（遵守数据授权） ----------
function buildContext(cfg: AIProviderConfig) {
  const g = cfg.grants
  const parts: string[] = []
  const dataUsed: string[] = []
  const courses = getCourses()

  parts.push(`学生：李明（ST2026001），计算机科学与技术专业。`)
  if (g.grades) {
    dataUsed.push('成绩与绩点')
    const sgpa = computeSGPA(), cgpa = computeCGPA()
    parts.push(`当前学期 SGPA=${sgpa}，累计 CGPA=${cgpa}。各科当前成绩：` +
      getCourseGrades().map(g2 => `${courseById(g2.courseId)?.name} ${g2.currentScore}分(${g2.trend === 'up' ? '上升' : g2.trend === 'down' ? '下降' : '持平'})`).join('；') + '。')
  }
  if (g.attendance) {
    dataUsed.push('考勤数据')
    parts.push(`总体出勤率 ${overallAttendanceRate()}%；各课程出勤率：` +
      courses.map(c => `${c.name} ${courseAttendanceRate(c.id)}%`).join('；') + '。')
  }
  if (g.timetable) {
    dataUsed.push('课程与课表数据')
    const nc = nextClass()
    parts.push(`今日课程：${getTimetable().filter(e => e.day === (new Date().getDay() + 6) % 7).map(e => `${courseById(e.courseId)?.name}(${e.room})`).join('、') || '今日无课'}。${nc ? `下一节课：${courseById(nc.courseId)?.name}。` : ''}`)
  }
  if (g.tasks) {
    dataUsed.push('学习任务数据')
    const ts = getTasks()
    parts.push(`学习任务：待办 ${ts.filter(t => t.status === 'todo').length} 项，进行中 ${ts.filter(t => t.status === 'doing').length} 项，今日截止 ${ts.filter(t => t.dueDate === todayISO && t.status !== 'done').length} 项。`)
  }
  return { promptCtx: parts.join('\n'), dataUsed }
}

// ---------- 内置规则问答 ----------
function builtinAnswer(question: string, cfg: AIProviderConfig): AIAnswer {
  const q = question.toLowerCase()
  const dataUsed: string[] = []
  const actions: ChatAction[] = []

  const has = (...ks: string[]) => ks.some(k => q.includes(k))

  if (has('考勤', '出勤', 'attendance', '缺勤', '迟到')) {
    if (!cfg.grants.attendance) return noGrantAnswer(['考勤数据'])
    dataUsed.push('考勤数据')
    const risks = attendanceRisks()
    const overall = overallAttendanceRate()
    const riskTxt = risks.length
      ? risks.map(r => `${courseById(r.courseId)?.name} 出勤率 ${r.rate}%（${r.level === 'below' ? '已低于' : '接近'}85% 警戒线）`).join('；')
      : '各课程出勤率均处于安全区间'
    return {
      content: `你的总体出勤率为 ${overall}%。按课程来看：${getCourses().map(c => `${c.name} ${courseAttendanceRate(c.id)}%`).join('；')}。\n需要留意：${riskTxt}。建议：机器学习课程本周保持全勤即可回到安全线；其余课程保持现状即可。`,
      actions: [{ label: '查看考勤中心', to: '/attendance' }],
      dataUsed, fallback: true,
    }
  }
  if (has('绩点', 'cgpa', 'gpa', '成绩', '分数', '考试', 'score')) {
    if (!cfg.grants.grades) return noGrantAnswer(['成绩与绩点数据'])
    dataUsed.push('成绩与绩点数据')
    const cgpa = computeCGPA(), sgpa = computeSGPA()
    const weakest = [...getCourseGrades()].sort((a, b) => a.currentScore - b.currentScore)[0]
    const strongest = [...getCourseGrades()].sort((a, b) => b.currentScore - a.currentScore)[0]
    return {
      content: `你当前累计 CGPA 为 ${cgpa}，本学期 SGPA 为 ${sgpa}。优势科目是 ${courseById(strongest.courseId)?.name}（${strongest.currentScore} 分）；${courseById(weakest.courseId)?.name}（${weakest.currentScore} 分，近期${weakest.trend === 'down' ? '下降' : '波动'}）是最优先的提升点。若想达到 8.5，建议在剩余课程中把 ${courseById(weakest.courseId)?.name} 拉到 85 分以上。`,
      actions: [{ label: '打开绩点规划', to: '/cgpa' }, { label: '查看学业表现', to: '/grades' }],
      dataUsed, fallback: true,
    }
  }
  if (has('课表', '课程', '上课', '教室', 'timetable', 'class', '下一节')) {
    if (!cfg.grants.timetable) return noGrantAnswer(['课程与课表数据'])
    dataUsed.push('课程与课表数据')
    const nc = nextClass()
    const day = (new Date().getDay() + 6) % 7
    const today = getTimetable().filter(e => e.day === day)
    const conflict = getTimetable().find(e => e.status === 'conflict')
    return {
      content: `${nc ? `你的下一节课是「${courseById(nc.courseId)?.name}」，在 ${nc.room}。` : '今天没有更多课程了。'}今天共有 ${today.length} 节课。${conflict ? `\n另外提醒：周三「${courseById(getTimetable().find(e => e.id === conflict.conflictWith)?.courseId ?? '')?.name}」与「${courseById(conflict.courseId)?.name}」时间冲突，课程表页有 AI 调整建议。` : ''}`,
      actions: [{ label: '打开今天课表', to: '/timetable' }],
      dataUsed, fallback: true,
    }
  }
  if (has('计划', '复习', '规划', '学习任务', 'plan', 'task', '目标')) {
    dataUsed.push('学习任务数据', '成绩与绩点数据')
    const undone = getTasks().filter(t => t.status !== 'done').length
    return {
      content: `你现在有 ${undone} 项未完成任务。建议这样安排：\n1. 优先完成高优先级任务（数据结构复习、机器学习习题）；\n2. 数据结构期末考试还有 12 天，建议每天投入 60 分钟，按「知识点 → 练习题 → 错题复盘 → 模拟测试」推进；\n3. 可以在任务中心使用「AI 拆解大目标」自动生成子任务。`,
      actions: [{ label: '打开学习任务', to: '/tasks' }, { label: '查看绩点目标', to: '/cgpa' }],
      dataUsed, fallback: true,
    }
  }
  if (has('你好', 'hello', 'hi', '在吗')) {
    return { content: '你好，李明！我是你的 AI 学习助手，可以帮你查课程、看考勤、分析成绩、制定学习计划。试试下面的快捷提问，或直接输入你的问题。', actions: [], dataUsed: [], fallback: true }
  }
  // 默认兜底
  const notif = getNotifications()[0]
  return {
    content: `我暂时没有完全理解你的问题，但可以帮你查这些内容：课程表、考勤率、成绩绩点、学习计划。\n${notif ? `另外，最新通知：${notif.title}——${notif.body}` : ''}`,
    actions: [{ label: '打开今日驾驶舱', to: '/' }, { label: '查看考勤中心', to: '/attendance' }],
    dataUsed: [], fallback: true,
  }
}

function noGrantAnswer(what: string[]): AIAnswer {
  return {
    content: `你已在「个人设置」中关闭了${what.join('、')}的授权，我无法读取相关数据为你作答。如需使用，请前往设置重新开启对应数据授权。`,
    actions: [{ label: '前往个人设置', to: '/settings' }],
    dataUsed: [], fallback: true,
  }
}

// ---------- 远程 Provider ----------
async function remoteAnswer(question: string, cfg: AIProviderConfig): Promise<string> {
  const ctx = buildContext(cfg)
  const sysPrompt = `你是 CampusFlow AI 学生助手，面向中国大学生李明（ST2026001）。请用简体中文、简洁友好地回答。回答基于以下学生数据：\n${ctx.promptCtx}\n如数据中没有相关信息，请如实说明，并提醒学生结果可能存在误差。`

  if (cfg.provider === 'dify') {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ inputs: {}, query: question, response_mode: 'blocking', user: 'ST2026001' }),
    })
    if (!res.ok) throw new Error(`Dify ${res.status}`)
    const data = await res.json()
    return data.answer ?? data.text ?? ''
  }
  // deepseek / openai 兼容：Chat Completions
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`Chat Completions ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ---------- 统一入口：失败回退链 ----------
export async function askAI(question: string, cfg: AIProviderConfig, _ctx: AIContext): Promise<AIAnswer> {
  if (cfg.provider !== 'builtin' && cfg.apiKey) {
    try {
      const content = await remoteAnswer(question, cfg)
      if (content && content.trim()) {
        const { dataUsed } = buildContext(cfg)
        return { content: content.trim(), actions: [{ label: '打开今日驾驶舱', to: '/' }], dataUsed, fallback: false }
      }
      throw new Error('empty response')
    } catch (err) {
      // 远程失败 → 本地回退 + 明确提示
      const local = builtinAnswer(question, cfg)
      return {
        ...local,
        content: `⚠️ ${_ctx.lang === 'zh' ? '接口请求失败，已切换为本地问答。你可以在「个人设置」中检查 AI 接口配置。' : 'Remote request failed; switched to local Q&A.'}\n\n${local.content}`,
        fallback: true,
      }
    }
  }
  // builtin 或未配置密钥 → 直接本地问答
  return builtinAnswer(question, cfg)
}

// ---------- AI 任务拆解（规则模拟，离线可用） ----------
export interface SplitResult { title: string; estimatedMin: number; dueOffsetDays: number; priority: 'high' | 'medium' | 'low' }

export function aiSplitGoal(goal: string): SplitResult[] {
  const g = goal.toLowerCase()
  const generic: SplitResult[] = [
    { title: `${goal} · 知识点梳理`, estimatedMin: 60, dueOffsetDays: 1, priority: 'high' },
    { title: `${goal} · 练习题 20 道`, estimatedMin: 90, dueOffsetDays: 3, priority: 'high' },
    { title: `${goal} · 错题复盘`, estimatedMin: 40, dueOffsetDays: 5, priority: 'medium' },
    { title: `${goal} · 模拟测试`, estimatedMin: 60, dueOffsetDays: 7, priority: 'medium' },
    { title: `${goal} · 总结复盘笔记`, estimatedMin: 30, dueOffsetDays: 8, priority: 'low' },
  ]
  if (g.includes('机器学习') || g.includes('ml')) {
    return [
      { title: `${goal}：通读第 6-8 章核心概念`, estimatedMin: 60, dueOffsetDays: 1, priority: 'high' },
      { title: `${goal}：推导线性回归与逻辑回归`, estimatedMin: 90, dueOffsetDays: 3, priority: 'high' },
      { title: `${goal}：完成 2 套往届试卷`, estimatedMin: 80, dueOffsetDays: 5, priority: 'high' },
      { title: `${goal}：整理模型评估指标错题`, estimatedMin: 45, dueOffsetDays: 6, priority: 'medium' },
      { title: `${goal}：模拟测试与复盘`, estimatedMin: 60, dueOffsetDays: 8, priority: 'medium' },
    ]
  }
  if (g.includes('数据结构') || g.includes('ds')) {
    return [
      { title: `${goal}：复习树与图的遍历`, estimatedMin: 60, dueOffsetDays: 1, priority: 'high' },
      { title: `${goal}：手写最短路/最小生成树算法`, estimatedMin: 90, dueOffsetDays: 3, priority: 'high' },
      { title: `${goal}：完成 30 道选择题+3 道编程题`, estimatedMin: 80, dueOffsetDays: 5, priority: 'high' },
      { title: `${goal}：错题复盘（期中 78 分丢分点）`, estimatedMin: 40, dueOffsetDays: 6, priority: 'medium' },
      { title: `${goal}：全真模拟 120 分钟`, estimatedMin: 120, dueOffsetDays: 10, priority: 'medium' },
    ]
  }
  return generic
}

// ---------- 今日 AI 建议 ----------
export function todaySuggestion(): { content: string; action: ChatAction } {
  const risks = attendanceRisks()
  if (risks.some(r => r.level === 'below')) {
    return { content: '机器学习出勤率 83% 已低于警戒线，今天准时上课是第一优先级。', action: { label: '查看考勤风险', to: '/attendance' } }
  }
  const weakest = [...getCourseGrades()].sort((a, b) => a.currentScore - b.currentScore)[0]
  return { content: `距数据结构期末还有 12 天，建议今天完成「图的遍历与最短路」复习任务。`, action: { label: '开始复习', to: '/tasks' } }
}

export { toISO }
