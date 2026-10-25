// 今日驾驶舱：核心行动、下一节课、健康度、考勤风险、考试倒计时、本周任务进度
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap, MapPin, ArrowRight, Heart, AlertTriangle, CalendarClock,
  ListChecks, Sparkles, Clock, ChevronRight, Clock3,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, RingProgress, ProgressBar, COURSE_COLORS } from '../components/ui'
import {
  nextClass, courseById, computeHealthScore, attendanceRisks,
  getTasks, overallAttendanceRate,
} from '../services/studentService'
import { nextExam } from '../data/mockData'
import { todaySuggestion } from '../services/aiService'

const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const Dashboard: React.FC = () => {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => { const id = setInterval(() => setTick(x => x + 1), 60000); return () => clearInterval(id) }, [])

  const nc = React.useMemo(() => nextClass(), [tick])
  const health = React.useMemo(() => computeHealthScore(), [tick])
  const risks = attendanceRisks()
  const tasks = getTasks()
  const suggestion = React.useMemo(() => todaySuggestion(), [tick])

  const weekTotal = tasks.length
  const weekDone = tasks.filter(x => x.status === 'done').length
  const todayTodo = tasks.filter(x => x.status !== 'done' && x.dueDate <= new Date().toISOString().slice(0, 10))
  const progress = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0

  const ncCourse = nc ? courseById(nc.courseId) : null
  const healthTone = health.total >= 75 ? 'green' : health.total >= 55 ? 'amber' : 'red'

  return (
    <div className="space-y-5 fade-in">
      {/* ===== 今日最重要行动 ===== */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 text-white p-5 md:p-6 relative">
        <div className="absolute -right-8 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Zap size={22} className="text-amber-300" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-teal-200 mb-1">{t('dash.todayAction')}</div>
            <p className="text-base md:text-lg font-semibold leading-snug">{suggestion.content}</p>
          </div>
          <button onClick={() => nav(suggestion.action.to)}
            className="shrink-0 bg-white text-primary-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-colors inline-flex items-center gap-1.5">
            {suggestion.action.label}<ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ===== 下一节课 ===== */}
        <Card hover className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock size={15} className="text-primary-500" />{t('dash.nextClass')}
            </span>
            {ncCourse && <Badge tone="primary">{nextExam.daysLeft} {t('dash.daysLeft')}</Badge>}
          </div>
          {nc && ncCourse ? (
            <>
              <div className={`rounded-xl p-4 ${COURSE_COLORS[ncCourse.color].bg}`}>
                <div className="font-bold text-lg text-slate-800">{lang === 'zh' ? ncCourse.name : ncCourse.nameEn}</div>
                <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin size={13} />{nc.room}
                </div>
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Clock3 size={13} />{fmtMin(nc.startMin)} – {fmtMin(nc.endMin)}
                </div>
              </div>
              <Link to="/timetable" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                {t('dash.viewTimetable')}<ChevronRight size={14} />
              </Link>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-slate-400">{t('dash.noMoreClass')}</div>
          )}
        </Card>

        {/* ===== 学习健康度 ===== */}
        <Card hover>
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Heart size={15} className="text-teal-500" />{t('dash.health')}
          </div>
          <div className="flex items-center gap-4">
            <RingProgress value={health.total} label={String(health.total)} />
            <div className="flex-1 space-y-1.5">
              <div className="text-xs text-slate-400 mb-2">{t('dash.basis')}</div>
              {health.parts.map(p => (
                <div key={p.key}>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span>{t(p.key)} <span className="text-slate-300">{p.weight}%</span></span>
                    <span className="font-semibold">{p.score}</span>
                  </div>
                  <ProgressBar value={p.score}
                    tone={p.score >= 75 ? 'bg-teal-500' : p.score >= 55 ? 'bg-amber-400' : 'bg-red-400'} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2"><Badge tone={healthTone as 'green' | 'amber' | 'red'}>{health.total} / 100</Badge></div>
        </Card>

        {/* ===== 考勤风险 + 考试倒计时 ===== */}
        <div className="space-y-5">
          <Card hover>
            <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={15} className={risks.length ? 'text-amber-500' : 'text-teal-500'} />{t('dash.attendanceRisk')}
            </div>
            {risks.length === 0 ? (
              <p className="text-sm text-slate-400">{t('dash.noRisk')}</p>
            ) : risks.map(r => (
              <div key={r.courseId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="text-sm text-slate-700">{courseById(r.courseId)?.name}</div>
                <Badge tone={r.level === 'below' ? 'red' : 'amber'}>{r.rate}%</Badge>
              </div>
            ))}
            <Link to="/attendance" className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 font-medium">
              {t('nav.attendance')}<ChevronRight size={14} />
            </Link>
          </Card>

          <Card hover>
            <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <CalendarClock size={15} className="text-red-400" />{t('dash.examCountdown')}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-400 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-3xl font-bold leading-none">{nextExam.daysLeft}</span>
                <span className="text-[10px] mt-1">{t('dash.daysLeft')}</span>
              </div>
              <div>
                <div className="font-semibold text-slate-800">{nextExam.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{nextExam.date}</div>
                <Link to="/tasks" className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 font-medium">
                  {t('dash.startReview')}<ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ===== 本周任务进度 ===== */}
        <Card hover>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <ListChecks size={15} className="text-violet-500" />{t('dash.weekProgress')}
            </span>
            <span className="text-xs text-slate-400">{weekDone}/{weekTotal} {t('dash.taskDone')}</span>
          </div>
          <ProgressBar value={progress} tone="bg-violet-500" className="!h-2.5" />
          <div className="mt-3 space-y-2">
            {todayTodo.length === 0
              ? <p className="text-xs text-slate-400 py-2">{t('task.emptyToday')}</p>
              : todayTodo.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate">{task.title}</span>
                  <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'slate'}>
                    {t(`common.${task.priority}`)}
                  </Badge>
                </div>
              ))}
          </div>
          <Link to="/tasks" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 font-medium">
            {t('nav.tasks')}<ChevronRight size={14} />
          </Link>
        </Card>

        {/* ===== 最近 AI 建议 ===== */}
        <Card hover className="bg-gradient-to-br from-white to-primary-50/40">
          <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Sparkles size={15} className="text-primary-500" />{t('dash.aiSuggestion')}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === 'zh'
              ? `总体出勤率 ${overallAttendanceRate()}%。数据结构期中 78 分、趋势下降，而期末仅剩 ${nextExam.daysLeft} 天；建议使用「目标反推」制定冲刺计划，并让 AI 把复习拆解为每日任务。`
              : `Overall attendance ${overallAttendanceRate()}%. Data Structures midterm was 78 with a downward trend, and the final is in ${nextExam.daysLeft} days. Use backward planning and let AI split review into daily tasks.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => nav('/aichat')} className="btn-primary !text-xs">{t('nav.aichat')}</button>
            <button onClick={() => nav('/cgpa')} className="btn-ghost !text-xs">{t('dash.calcGpa')}</button>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">{t('common.aiHint')}</p>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
