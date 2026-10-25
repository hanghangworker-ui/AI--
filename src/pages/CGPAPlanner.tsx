// 绩点与目标规划：成绩录入 + SGPA/CGPA 计算 + 目标反推（保守/标准/冲刺）+ 导出报告
import React from 'react'
import { Target, Download, GraduationCap, Wand2, TrendingUp } from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, toast } from '../components/ui'
import { getCourses, computeSGPA, computeCGPA, scoreToGP } from '../services/studentService'
import { courseGrades } from '../data/mockData'
import { backwardPlan, exportPlanReport } from '../services/plannerService'

const CGPAPlanner: React.FC = () => {
  const { t, lang } = useI18n()
  const courses = getCourses()

  // 录入成绩（默认取各科当前综合成绩）
  const [scores, setScores] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    courseGrades.forEach(g => { init[g.courseId] = g.currentScore })
    return init
  })
  const [target, setTarget] = React.useState('8.5')
  const [targetVal, setTargetVal] = React.useState(8.5) // 已执行反推的目标
  const [plan, setPlan] = React.useState<ReturnType<typeof backwardPlan> | null>(() => backwardPlan(8.5))
  const [targetErr, setTargetErr] = React.useState('')

  const sgpa = computeSGPA()
  const cgpa = computeCGPA()
  const planNames = { conservative: t('gp.conservative'), standard: t('gp.standard'), sprint: t('gp.sprint') }

  const runPlan = () => {
    const v = parseFloat(target)
    if (isNaN(v) || v < 0 || v > 10) { setTargetErr(t('gp.invalid')); setPlan(null); return }
    setTargetErr('')
    setTargetVal(v)
    setPlan(backwardPlan(v))
  }

  const exportReport = () => {
    const text = exportPlanReport(targetVal, backwardPlan(targetVal))
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CampusFlow-目标规划报告-${targetVal}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('gp.exported'))
  }

  return (
    <div className="fade-in space-y-5">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Target size={19} className="text-primary-500" />{t('gp.title')}
      </h1>

      {/* 概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('gp.sgpa'), value: sgpa, icon: GraduationCap, tone: 'text-primary-600 bg-primary-50' },
          { label: t('gp.cgpa'), value: cgpa, icon: GraduationCap, tone: 'text-teal-600 bg-teal-50' },
          { label: t('gp.target'), value: targetVal, icon: Target, tone: 'text-violet-600 bg-violet-50' },
          { label: t('gp.gap'), value: plan ? (plan.gap > 0 ? `+${plan.gap}` : plan.gap) : '—', icon: TrendingUp, tone: plan && plan.gap > 0.3 ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-100' },
        ].map(s => (
          <Card key={s.label} hover className="!p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.tone} mb-2`}>
              <s.icon size={16} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 成绩录入 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4">{t('gp.semester')}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">{t('gr.course')}</th>
                <th className="py-2 font-medium w-16">{t('gp.credit')}</th>
                <th className="py-2 font-medium w-24">{lang === 'zh' ? '成绩' : 'Score'}</th>
                <th className="py-2 font-medium w-16">{t('gp.gp')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="py-2.5 text-slate-700">{lang === 'zh' ? c.name : c.nameEn}</td>
                  <td className="py-2.5 text-slate-500">{c.credits}</td>
                  <td className="py-2.5">
                    <input type="number" min={0} max={100} value={scores[c.id] ?? 80}
                      onChange={e => setScores(s => ({ ...s, [c.id]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                      className="input !py-1 !px-2 text-sm" />
                  </td>
                  <td className="py-2.5"><Badge tone="primary">{scoreToGP(scores[c.id] ?? 80)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-slate-400">
            {lang === 'zh' ? '修改成绩后绩点随「反推」同步变化；录入口仅用于本页演示计算。' : 'Scores affect backward planning; inputs are demo-only.'}
          </p>
        </Card>

        {/* 目标反推 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Wand2 size={15} className="text-primary-500" />{t('gp.setTarget')}
          </div>
          <div className="flex gap-2">
            <input value={target} onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runPlan()}
              placeholder="8.5" className="input flex-1" />
            <button onClick={runPlan} className="btn-primary">{t('gp.plan')}</button>
          </div>
          {targetErr && <p className="mt-1.5 text-xs text-red-500">{targetErr}</p>}

          {plan && (
            <div className="mt-4 space-y-3 fade-in">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{t('gp.needAvg')}</span>
                  <span className="font-bold text-primary-600">{plan.needAvgGP}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {t('gp.priority')}：{plan.priorityCourses.map(c => c.name).join('、')}
                </div>
              </div>
              {plan.plans.map(p => (
                <div key={p.name} className={`rounded-xl border p-3.5 ${
                  p.name === 'standard' ? 'border-primary-200 bg-primary-50/50' : 'border-slate-150 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <Badge tone={p.name === 'sprint' ? 'red' : p.name === 'standard' ? 'primary' : 'slate'}>{planNames[p.name]}</Badge>
                    <span className="text-xs text-slate-500">{t('gp.weeklyHours')}：<b className="text-slate-700">{p.weeklyHours} {t('gp.hours')}</b></span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {t('gp.needAvg')} ≈ {p.needAvgGP} · {p.focusCourses.join('、')}
                  </div>
                </div>
              ))}
              <button onClick={exportReport} className="btn-ghost w-full">
                <Download size={14} />{t('gp.export')}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default CGPAPlanner
