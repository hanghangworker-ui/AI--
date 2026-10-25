// 学业表现：成绩列表 + 趋势图 + 优劣势分析 + 考试记录 + AI 建议
import React from 'react'
import { LineChart as LineChartIcon, TrendingUp, TrendingDown, Sparkles, CalendarClock } from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, TrendBadge, COURSE_COLORS, ProgressBar } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getCourses, getCourseGrades, getExamResults, courseById } from '../services/studentService'
import { nextExam } from '../data/mockData'

const Grades: React.FC = () => {
  const { t, lang } = useI18n()
  const courses = getCourses()
  const grades = getCourseGrades()
  const exams = [...getExamResults()].sort((a, b) => b.date.localeCompare(a.date))

  const sorted = [...grades].sort((a, b) => b.currentScore - a.currentScore)
  const strengths = sorted.slice(0, 2)
  const weak = sorted.slice(-2)

  // 趋势图数据：按考试日期排列的各科成绩点
  const chartData = [...exams].sort((a, b) => a.date.localeCompare(b.date)).map(ex => {
    const point: Record<string, string | number> = { date: ex.date.slice(5), [courseById(ex.courseId)?.nameEn ?? courseById(ex.courseId)?.name ?? '']: ex.score }
    return point
  })
  // 重新组装成按科目的序列
  const series = courses.map(c => ({
    name: lang === 'zh' ? c.name : c.nameEn,
    color: { indigo: '#6366f1', teal: '#14b8a6', violet: '#8b5cf6', sky: '#0ea5e9', amber: '#f59e0b' }[c.color] ?? '#6366f1',
    data: [...getExamResults().filter(e => e.courseId === c.id)].sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ date: e.date.slice(5), score: e.score, title: e.title })),
  })).filter(s => s.data.length > 0)

  const advice = lang === 'zh'
    ? `数据结构期中 78 分（低于班级均分）且期末仅剩 ${nextExam.daysLeft} 天，建议：① 每天固定 60 分钟专题复习；② 用「目标反推」把它拉到 85 分可让 SGPA 提升约 0.5。机器学习呈下降趋势，优先补第 6-8 章练习。面向对象 95 分表现突出，可参加课程设计竞赛转化为项目经历。`
    : `Data Structures midterm was 78 and the final is in ${nextExam.daysLeft} days: study 60 min/day and use backward planning to push it to 85 (+0.5 SGPA). ML is trending down — focus on chapters 6-8. OOP at 95 is a strength worth turning into a project.`

  return (
    <div className="fade-in space-y-5">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <LineChartIcon size={19} className="text-primary-500" />{t('gr.title')}
      </h1>

      {/* 成绩趋势图 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-4">{lang === 'zh' ? '成绩趋势' : 'Grade trend'}</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              {series.map(s => (
                <Line key={s.name} data={s.data} dataKey="score" name={s.name} stroke={s.color}
                  strokeWidth={2.2} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 课程成绩列表 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4">{lang === 'zh' ? '各科当前成绩' : 'Current scores'}</div>
          <div className="space-y-4">
            {grades.map(g => {
              const c = courseById(g.courseId)!
              const color = COURSE_COLORS[c.color] ?? COURSE_COLORS.indigo
              return (
                <div key={g.courseId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-700 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      {lang === 'zh' ? c.name : c.nameEn}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{g.currentScore}</span>
                      <TrendBadge trend={g.trend} />
                    </span>
                  </div>
                  <ProgressBar value={g.currentScore}
                    tone={g.currentScore >= 90 ? 'bg-teal-500' : g.currentScore >= 80 ? 'bg-primary-400' : 'bg-amber-400'} />
                </div>
              )
            })}
          </div>
          {/* 优势与待提升 */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <div className="text-[11px] font-semibold text-emerald-700 mb-1.5 flex items-center gap-1">
                <TrendingUp size={12} />{t('gr.strength')}
              </div>
              {strengths.map(g => (
                <div key={g.courseId} className="text-xs text-slate-600">{courseById(g.courseId)?.name} · {g.currentScore}</div>
              ))}
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-[11px] font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                <TrendingDown size={12} />{t('gr.weak')}
              </div>
              {weak.map(g => (
                <div key={g.courseId} className="text-xs text-slate-600">{courseById(g.courseId)?.name} · {g.currentScore}</div>
              ))}
            </div>
          </div>
        </Card>

        {/* 考试记录 + 倒计时 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-700">{t('gr.examList')}</div>
            <Badge tone="red"><CalendarClock size={11} />{t('gr.examIn')} {nextExam.daysLeft} {t('dash.daysLeft')}</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {exams.map(ex => {
              const c = courseById(ex.courseId)
              return (
                <div key={ex.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm text-slate-700">{lang === 'zh' ? c?.name : c?.nameEn} · {ex.title}</div>
                    <div className="text-[11px] text-slate-400">{ex.date} · {lang === 'zh' ? `权重 ${ex.weight}%` : `weight ${ex.weight}%`}</div>
                  </div>
                  <Badge tone={ex.score >= 90 ? 'green' : ex.score >= 80 ? 'primary' : 'amber'}>{ex.score}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* AI 学习建议 */}
      <Card className="bg-gradient-to-br from-white to-primary-50/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
          <Sparkles size={15} className="text-primary-500" />{t('gr.suggestion')}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{advice}</p>
        <p className="mt-2.5 text-[10px] text-slate-400">{t('common.aiHint')}</p>
      </Card>
    </div>
  )
}

export default Grades
