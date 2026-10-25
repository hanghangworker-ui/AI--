// 绩点规划：SGPA/CGPA 计算、目标反推（保守/标准/冲刺）、报告导出
import { courses, courseGrades } from '../data/mockData'
import { computeCGPA, computeSGPA, scoreToGP, courseById } from './studentService'

export interface BackwardPlan {
  name: 'conservative' | 'standard' | 'sprint'
  weeklyHours: number
  needAvgGP: number
  focusCourses: string[]
  desc: string
}

/** 目标反推：给定目标 CGPA，推导剩余课程所需平均绩点与三档方案 */
export function backwardPlan(targetCgpa: number): {
  gap: number
  plans: BackwardPlan[]
  needAvgGP: number
  priorityCourses: { name: string; score: number; gp: number; credits: number }[]
} {
  const current = computeCGPA()
  const gap = Math.round((targetCgpa - current) * 100) / 100
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
  // 演示模型：剩余可修学分约 60（未来学期），需要的平均绩点
  const remainingCredits = 60
  const histCredits = 47.5 // 已修
  const needAvgGP = gap <= 0
    ? 0
    : Math.round(((targetCgpa * (histCredits + remainingCredits)) - current * histCredits) / remainingCredits * 100) / 100

  // 优先课程 = 成绩最低/趋势下降的课
  const sorted = [...courseGrades].sort((a, b) => a.currentScore - b.currentScore)
  const priorityCourses = sorted.slice(0, 3).map(g => ({
    name: courseById(g.courseId)?.name ?? '',
    score: g.currentScore,
    gp: scoreToGP(g.currentScore),
    credits: courseById(g.courseId)?.credits ?? 0,
  }))

  const plans: BackwardPlan[] = [
    {
      name: 'conservative',
      weeklyHours: 6,
      needAvgGP: Math.max(needAvgGP - 0.3, 0),
      focusCourses: priorityCourses.slice(0, 1).map(c => c.name),
      desc: '保持当前状态，重点补强 1 门最弱课程，稳住出勤率即可。',
    },
    {
      name: 'standard',
      weeklyHours: 10,
      needAvgGP,
      focusCourses: priorityCourses.slice(0, 2).map(c => c.name),
      desc: '每周固定 10 小时自主学习，把最弱 2 门课程拉到 85 分以上。',
    },
    {
      name: 'sprint',
      weeklyHours: 15,
      needAvgGP: needAvgGP + 0.4,
      focusCourses: priorityCourses.map(c => c.name),
      desc: '高强度方案：三门前置课程同步提升，配合 AI 拆解任务与每周模拟测试，冲击专业前 10%。',
    },
  ]
  return { gap, plans, needAvgGP, priorityCourses }
}

/** 导出规划报告（生成可下载的文本报告） */
export function exportPlanReport(targetCgpa: number, plan: ReturnType<typeof backwardPlan>): string {
  const d = new Date()
  const line = '='.repeat(46)
  return [
    'CampusFlow AI · 目标规划报告',
    line,
    `生成时间：${d.toLocaleString('zh-CN')}`,
    `学生：李明（ST2026001）· 计算机科学与技术`,
    '',
    `当前 CGPA：${computeCGPA()}    本学期 SGPA：${computeSGPA()}`,
    `目标 CGPA：${targetCgpa}    差距：${plan.gap > 0 ? '+' : ''}${plan.gap}`,
    '',
    '一、优先提升课程',
    ...plan.priorityCourses.map(c => `  · ${c.name}：当前 ${c.score} 分（绩点 ${c.gp}，${c.credits} 学分）`),
    '',
    '二、三档方案',
    ...plan.plans.flatMap(p => [
      `  【${{ conservative: '保守', standard: '标准', sprint: '冲刺' }[p.name]}】`,
      `    剩余课程所需平均绩点：${p.needAvgGP}`,
      `    每周建议投入：${p.weeklyHours} 小时`,
      `    重点课程：${p.focusCourses.join('、')}`,
      `    ${p.desc}`,
      '',
    ]),
    '三、风险提示',
    '  · 机器学习出勤率 83%，低于 85% 警戒线，将影响平时分；',
    '  · 数据结构期中 78 分且趋势下降，期末还有 12 天；',
    '  · 建议每周日晚复盘一次任务完成率。',
    '',
    '本报告由 CampusFlow AI 生成，AI 内容仅供参考。',
  ].join('\n')
}
