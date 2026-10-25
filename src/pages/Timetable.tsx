// 课程表：日/周视图 + 冲突检测解释 + AI 调整建议 + 一键生成学习任务
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, Wand2,
  Check, MapPin, User, Plus, Clock3, Sparkles,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, COURSE_COLORS, toast } from '../components/ui'
import type { StudyTask, TimetableEntry } from '../types'
import { getCourses, courseById, getTimetable, saveTimetable, getTasks, saveTasks } from '../services/studentService'
import { addDaysISO } from '../data/mockData'

const DAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const TimetablePage: React.FC = () => {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const [view, setView] = React.useState<'day' | 'week'>('week')
  const [tt, setTT] = React.useState<TimetableEntry[]>(() => getTimetable())
  const [dayOffset, setDayOffset] = React.useState(0) // 相对今天

  const days = lang === 'zh' ? DAYS_ZH : DAYS_EN
  const todayIdx = (new Date().getDay() + 6) % 7
  const viewDay = ((todayIdx + dayOffset) % 7 + 7) % 7

  const persist = (next: TimetableEntry[]) => { setTT(next); saveTimetable(next) }

  const conflictPairs = tt.filter(e => e.status === 'conflict')

  const acceptAlternative = (entryId: string) => {
    const entry = tt.find(e => e.id === entryId)
    if (!entry?.alternative) return
    persist(tt.map(e => {
      if (e.id === entryId) return { ...e, status: 'adjusted', day: e.alternative!.day, startMin: e.alternative!.startMin, endMin: e.alternative!.endMin, room: e.alternative!.room }
      if (e.id === entry.conflictWith) return { ...e, status: 'normal', conflictWith: undefined }
      return e
    }))
    toast(lang === 'zh' ? '已按建议调整课程时间' : 'Schedule adjusted')
  }

  const genTasks = () => {
    const todayEntries = tt.filter(e => e.day === todayIdx)
    const tasks = getTasks()
    const newTasks: StudyTask[] = todayEntries.map((e, i) => ({
      id: `gen-${Date.now()}-${i}`,
      title: `${lang === 'zh' ? '复习' : 'Review'}${courseById(e.courseId)?.name ?? ''}·${lang === 'zh' ? '课堂内容整理' : 'class notes'}`,
      courseId: e.courseId,
      estimatedMin: 30,
      dueDate: addDaysISO(1),
      priority: 'medium',
      status: 'todo',
      fromAI: true,
      createdAt: new Date().toISOString(),
    }))
    saveTasks([...tasks, ...newTasks])
    toast(t('tt.genTaskDone'))
  }

  const EntryCard: React.FC<{ e: TimetableEntry }> = ({ e }) => {
    const c = courseById(e.courseId)
    if (!c) return null
    const color = COURSE_COLORS[c.color] ?? COURSE_COLORS.indigo
    return (
      <div className={`rounded-xl border p-3 ${color.bg} ${color.ring} ${e.status === 'conflict' ? 'ring-2 ring-amber-300' : ''}`}>
        <div className="flex items-start justify-between gap-1">
          <span className="font-semibold text-sm text-slate-800">{lang === 'zh' ? c.name : c.nameEn}</span>
          {e.status === 'conflict' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
          {e.status === 'adjusted' && <Badge tone="green"><Check size={11} />{t('tt.adjusted')}</Badge>}
        </div>
        <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1"><Clock3 size={11} />{fmtMin(e.startMin)}–{fmtMin(e.endMin)}</div>
          <div className="flex items-center gap-1"><User size={11} />{c.teacher}</div>
          <div className="flex items-center gap-1"><MapPin size={11} />{e.room}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays size={19} className="text-primary-500" />{t('tt.title')}
        </h1>
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            <button onClick={() => setView('day')} className={`px-3 py-1.5 transition-colors ${view === 'day' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t('tt.dayView')}</button>
            <button onClick={() => setView('week')} className={`px-3 py-1.5 transition-colors ${view === 'week' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t('tt.weekView')}</button>
          </div>
          {view === 'day' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setDayOffset(o => o - 1)} className="btn-ghost !p-1.5"><ChevronLeft size={15} /></button>
              <button onClick={() => setDayOffset(0)} className="btn-ghost !text-xs">{dayOffset === 0 ? t('tt.today') : days[viewDay]}</button>
              <button onClick={() => setDayOffset(o => o + 1)} className="btn-ghost !p-1.5"><ChevronRight size={15} /></button>
            </div>
          )}
          <button onClick={genTasks} className="btn-primary !text-xs"><Plus size={13} />{t('tt.genTask')}</button>
        </div>
      </div>

      {/* ===== 冲突解释卡 ===== */}
      {conflictPairs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={17} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-amber-800">{t('tt.conflict')} · {days[conflictPairs[0].day]}</div>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {t('tt.conflictReason', {
                  a: courseById(conflictPairs[0].courseId)?.name ?? '',
                  b: courseById(conflictPairs.find(e => e.id === conflictPairs[0].conflictWith)?.courseId ?? '')?.name ?? '',
                })}
              </p>
              {/* AI 调整建议 */}
              {(() => {
                const target = conflictPairs.find(e => e.alternative) // 拥有替代方案的一方
                if (!target?.alternative) return null
                const alt = target.alternative
                return (
                  <div className="mt-3 rounded-xl bg-white border border-amber-100 p-3">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary-600">
                      <Wand2 size={13} />{t('tt.aiAdjust')}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">
                      {courseById(target.courseId)?.name} → {days[alt.day]} {fmtMin(alt.startMin)}–{fmtMin(alt.endMin)} · {alt.room}
                      <span className="text-slate-400">（{lang === 'zh' ? '该时段教室空闲，且与你的其他课程不冲突' : 'slot is free'}）</span>
                    </p>
                    <button onClick={() => acceptAlternative(target.id)} className="btn-primary !text-xs mt-2.5">
                      <Check size={13} />{t('tt.acceptAlt')}
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* ===== 周视图 ===== */}
      {view === 'week' ? (
        <Card className="!p-4 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] gap-2">
            {days.map((d, i) => (
              <div key={d}>
                <div className={`text-center text-xs font-semibold py-2 rounded-lg ${i === todayIdx ? 'bg-primary-600 text-white' : 'text-slate-400'}`}>
                  {d}
                </div>
                <div className="space-y-2 mt-1.5">
                  {tt.filter(e => e.day === i).map(e => <EntryCard key={e.id} e={e} />)}
                  {tt.filter(e => e.day === i).length === 0 && (
                    <div className="text-center text-[11px] text-slate-300 py-4">—</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        /* 日视图 */
        <Card>
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-slate-700">{days[viewDay]} · {addDaysISO(dayOffset).slice(5)}</div>
          </div>
          {tt.filter(e => e.day === viewDay).length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">{t('tt.noClass')}</p>
          ) : (
            <div className="space-y-2.5">
              {tt.filter(e => e.day === viewDay)
                .sort((a, b) => a.startMin - b.startMin)
                .map(e => <EntryCard key={e.id} e={e} />)}
            </div>
          )}
        </Card>
      )}

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 px-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" />{lang === 'zh' ? '冲突' : 'conflict'}</span>
        <span className="flex items-center gap-1"><Check size={11} className="text-emerald-500" />{t('tt.adjusted')}</span>
        <span className="flex items-center gap-1"><Sparkles size={11} className="text-primary-400" />{t('common.aiHint')}</span>
      </div>
    </div>
  )
}

export default TimetablePage
