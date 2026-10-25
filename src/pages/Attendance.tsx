// 考勤中心：总体出勤率 + 按课程 + 月历视图 + 临界提醒 + 改善建议
import React from 'react'
import { ClipboardCheck, AlertTriangle, Lightbulb, CalendarDays } from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, ProgressBar, RingProgress, COURSE_COLORS } from '../components/ui'
import { ATTEND_LABEL } from '../types'
import { getCourses, getAttendance, overallAttendanceRate, courseAttendanceRate, courseById } from '../services/studentService'
import { toISO } from '../data/mockData'

const courseByIdName = (id: string) => courseById(id)?.name ?? ''

const Attendance: React.FC = () => {
  const { t, lang } = useI18n()
  const courses = getCourses()
  const recs = getAttendance()
  const overall = overallAttendanceRate()

  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = (firstDay.getDay() + 6) % 7 // 周一开头

  const recByDate = new Map<string, typeof recs>()
  recs.forEach(r => {
    const arr = recByDate.get(r.date) ?? []
    arr.push(r)
    recByDate.set(r.date, arr)
  })

  const risky = courses.filter(c => courseAttendanceRate(c.id) < 88)

  const improveAdvice = lang === 'zh'
    ? [
        '机器学习课程出勤率 83%，已低于 85% 警戒线：本周 3 节课全部准时到课即可回升至安全区间。',
        '数据结构课程有 2 次迟到记录，建议提前 10 分钟出发，避开教学楼 A 与实验楼 C 之间的转场高峰。',
        '保持其余课程的出勤习惯，期末阶段请勿因复习缺课——平时分占比约 30%。',
      ]
    : [
        'ML attendance is 83%, below the 85% warn line: attend all 3 sessions this week to recover.',
        'Two late arrivals in Data Structures — leave 10 minutes earlier.',
        'Keep current habits; do not skip classes before finals — participation weighs ~30%.',
      ]

  return (
    <div className="fade-in space-y-5">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <ClipboardCheck size={19} className="text-primary-500" />{t('at.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 总体出勤率 */}
        <Card className="flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-slate-700 mb-3">{t('at.overall')}</div>
          <RingProgress value={overall} label={`${overall}%`} color="#1d40d0" />
          <Badge tone={overall >= 95 ? 'green' : overall >= 85 ? 'amber' : 'red'} className="!mt-3">
            {overall}%{overall < 85 ? ` · ${t('at.belowLine')}` : overall < 95 ? ` · ${t('at.warnLine')}` : ''}
          </Badge>
          <p className="mt-3 text-xs text-slate-400">{recs.length} {t('at.records')}</p>
        </Card>

        {/* 按课程 */}
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-slate-700 mb-4">{t('at.byCourse')}</div>
          <div className="space-y-4">
            {courses.map(c => {
              const rate = courseAttendanceRate(c.id)
              const color = COURSE_COLORS[c.color] ?? COURSE_COLORS.indigo
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-700 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      {lang === 'zh' ? c.name : c.nameEn}
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`font-semibold ${rate < 85 ? 'text-red-500' : rate < 88 ? 'text-amber-600' : 'text-slate-700'}`}>{rate}%</span>
                      {rate < 85 && <Badge tone="red"><AlertTriangle size={11} />{t('at.belowLine')}</Badge>}
                      {rate >= 85 && rate < 88 && <Badge tone="amber">{t('at.nearLine')}</Badge>}
                    </span>
                  </div>
                  <div className="relative">
                    <ProgressBar value={rate} tone={rate < 85 ? 'bg-red-400' : rate < 88 ? 'bg-amber-400' : 'bg-teal-500'} />
                    {/* 85% 警戒线标记 */}
                    <div className="absolute top-0 left-[85%] h-2 w-0.5 bg-red-400/70 -translate-x-1/2" title={t('at.warnLine')} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />{t('at.warnLine')}</span>
            <span>{lang === 'zh' ? '低于 85% 将影响平时分' : 'Below 85% affects participation score'}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 月历视图 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <CalendarDays size={15} className="text-primary-500" />{t('at.calendar')}
            </div>
            <span className="text-sm text-slate-400">{now.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' })}</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {(lang === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d, i) => (
              <div key={i} className="text-[10px] text-slate-400 py-1">{d}</div>
            ))}
            {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const iso = toISO(new Date(year, month, i + 1))
              const dayRecs = recByDate.get(iso) ?? []
              const worst = dayRecs.some(r => r.status === 'absent') ? 'absent'
                : dayRecs.some(r => r.status === 'late') ? 'late'
                : dayRecs.length > 0 ? 'present' : null
              const isToday = iso === toISO(new Date())
              const cls = worst === 'absent' ? 'bg-red-100 text-red-600 border-red-200'
                : worst === 'late' ? 'bg-amber-100 text-amber-700 border-amber-200'
                : worst === 'present' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-400 border-slate-100'
              return (
                <div key={iso} title={dayRecs.map(r => `${courseByIdName(r.courseId)}: ${ATTEND_LABEL[r.status][lang]}`).join('；')}
                  className={`h-9 rounded-lg border text-xs flex items-center justify-center ${cls} ${isToday ? 'ring-2 ring-primary-400 font-bold' : ''}`}>
                  {i + 1}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
            {(['present', 'late', 'absent'] as const).map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded ${ATTEND_LABEL[s].cls}`} />{t(`at.${s === 'present' ? 'present' : s}`)}
              </span>
            ))}
          </div>
        </Card>

        {/* 改善建议 */}
        <div className="space-y-5">
          {risky.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3">
                <AlertTriangle size={15} />{lang === 'zh' ? '临界课程提醒' : 'Near-line courses'}
              </div>
              {risky.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-amber-100/60 last:border-0">
                  <span className="text-sm text-slate-700">{lang === 'zh' ? c.name : c.nameEn}</span>
                  <Badge tone={courseAttendanceRate(c.id) < 85 ? 'red' : 'amber'}>
                    {courseAttendanceRate(c.id)}% · {courseAttendanceRate(c.id) < 85 ? t('at.belowLine') : t('at.nearLine')}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Lightbulb size={15} className="text-teal-500" />{t('at.improve')}
            </div>
            <ol className="space-y-2.5">
              {improveAdvice.map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Attendance
