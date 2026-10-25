// 学习任务中心：分组任务 + 新增/编辑/完成 + AI 拆解 + 周进度 + 连续学习天数
import React from 'react'
import {
  ListChecks, Plus, Sparkles, Check, Trash2, Play, Flame,
  Clock3, CalendarDays, Wand2, X, Pencil,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, ProgressBar, EmptyState, toast, COURSE_COLORS } from '../components/ui'
import type { StudyTask } from '../types'
import { getTasks, saveTasks, studyStreak, courseById, getCourses } from '../services/studentService'
import { aiSplitGoal } from '../services/aiService'
import { addDaysISO, todayISO } from '../data/mockData'

const uid = () => Math.random().toString(36).slice(2, 10)

const StudyTasks: React.FC = () => {
  const { t, lang } = useI18n()
  const [tasks, setTasks] = React.useState<StudyTask[]>(() => getTasks())
  const [showAdd, setShowAdd] = React.useState(false)
  const [showSplit, setShowSplit] = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)

  const persist = (next: StudyTask[]) => { setTasks(next); saveTasks(next) }

  // 新增任务表单
  const [form, setForm] = React.useState({ title: '', est: 30, due: addDaysISO(1), priority: 'medium' as StudyTask['priority'], courseId: '' })
  const [splitGoal, setSplitGoal] = React.useState('')

  const addTask = () => {
    if (!form.title.trim()) return
    persist([{
      id: uid(), title: form.title.trim(), courseId: form.courseId || undefined,
      estimatedMin: form.est, dueDate: form.due, priority: form.priority,
      status: 'todo', fromAI: false, createdAt: new Date().toISOString(),
    }, ...tasks])
    setForm({ title: '', est: 30, due: addDaysISO(1), priority: 'medium', courseId: '' })
    setShowAdd(false)
    toast(lang === 'zh' ? '任务已添加' : 'Task added')
  }

  const doSplit = () => {
    if (!splitGoal.trim()) return
    const subs = aiSplitGoal(splitGoal.trim())
    const newTasks: StudyTask[] = subs.map(s => ({
      id: uid(), title: s.title, courseId: undefined,
      estimatedMin: s.estimatedMin, dueDate: addDaysISO(s.dueOffsetDays),
      priority: s.priority, status: 'todo', fromAI: true,
      createdAt: new Date().toISOString(),
    }))
    persist([...newTasks, ...tasks])
    toast(t('task.splitDone', { n: subs.length }))
    setSplitGoal('')
    setShowSplit(false)
  }

  const setStatus = (id: string, status: StudyTask['status']) => {
    persist(tasks.map(x => x.id === id ? { ...x, status } : x))
  }

  const delTask = (id: string) => {
    if (!confirm(t('task.delConfirm'))) return
    persist(tasks.filter(x => x.id !== id))
  }

  const editTask = (task: StudyTask) => {
    const title = prompt(lang === 'zh' ? '修改任务标题' : 'Edit task title', task.title)
    if (title && title.trim()) persist(tasks.map(x => x.id === task.id ? { ...x, title: title.trim() } : x))
  }

  const streak = studyStreak()
  const done = tasks.filter(x => x.status === 'done')
  const progress = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0

  // 分组：按截止日期归入今日/进行中/计划中/已完成，覆盖全部任务且互不重复
  const isOverdue = (d: string) => d < todayISO
  const groups: { key: string; tone: 'amber' | 'primary' | 'slate' | 'green'; items: StudyTask[] }[] = [
    { key: 'task.today', tone: 'amber', items: tasks.filter(x => x.status !== 'done' && x.dueDate <= todayISO) },
    { key: 'task.doing', tone: 'primary', items: tasks.filter(x => x.status === 'doing' && x.dueDate > todayISO) },
    { key: 'task.upcoming', tone: 'slate', items: tasks.filter(x => x.status === 'todo' && x.dueDate > todayISO) },
    { key: 'task.finished', tone: 'green', items: done },
  ]

  const TaskRow: React.FC<{ task: StudyTask }> = ({ task }) => {
    const c = task.courseId ? courseById(task.courseId) : null
    const color = c ? COURSE_COLORS[c.color] ?? COURSE_COLORS.indigo : null
    const dueSoon = task.status !== 'done' && task.dueDate <= addDaysISO(1)
    const overdue = task.status !== 'done' && isOverdue(task.dueDate)
    return (
      // 堆叠式布局：标题独占整行可换行，元信息与操作按钮在第二行自动折行 —— 窄栏下也不会被压成竖排字
      <div className={`rounded-xl px-3 py-2.5 transition-all ${
        task.status === 'done' ? 'bg-slate-50/60' : overdue ? 'bg-red-50/40 border border-red-100' : 'bg-white hover:bg-primary-50/30 border border-slate-100'
      }`}>
        <div className="flex items-start gap-2.5">
          {/* 状态按钮 */}
          {task.status === 'done' ? (
            <button onClick={() => setStatus(task.id, 'todo')} title={t('task.markUndone')}
              className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check size={12} />
            </button>
          ) : (
            <button onClick={() => setStatus(task.id, task.status === 'doing' ? 'done' : 'doing')}
              title={task.status === 'doing' ? t('task.markDone') : t('task.markDoing')}
              className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-200 hover:border-emerald-400 flex items-center justify-center shrink-0 transition-colors">
              {task.status === 'doing' && <Play size={10} className="text-primary-500" />}
            </button>
          )}
          <div className="flex-1 min-w-0">
            {/* 标题独占整行、可折两行，不被徽章挤压 */}
            <div className={`text-[13px] leading-snug break-words line-clamp-2 ${
              task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'
            }`}>
              {task.title}
            </div>
            {/* 元信息 + 操作：整体可折行，空间不足时另起一行而非挤压标题 */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400">
              <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'slate'}
                className="!px-1.5 shrink-0">{t(`common.${task.priority}`)}</Badge>
              {c && <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${color!.dot}`} />{lang === 'zh' ? c.name : c.nameEn}</span>}
              <span className="flex items-center gap-1"><Clock3 size={11} />{task.estimatedMin} {t('common.minutes')}</span>
              <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-500 font-medium' : ''}`}>
                <CalendarDays size={11} />{overdue && `${t('task.overdue')} · `}{t('task.due')} {task.dueDate.slice(5)}
              </span>
              {task.fromAI && <Badge tone="violet"><Sparkles size={10} />{t('task.fromAI')}</Badge>}
              {/* 操作按钮：始终可见（触屏无 hover），弱化配色，靠右不占固定宽度 */}
              <span className="flex items-center gap-0.5 ml-auto">
                <button onClick={() => editTask(task)} title={t('common.edit')}
                  className="p-1 rounded-md text-slate-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Pencil size={12} /></button>
                <button onClick={() => delTask(task.id)} title={t('common.delete')}
                  className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ListChecks size={19} className="text-primary-500" />{t('task.title')}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowSplit(v => !v); setShowAdd(false) }} className="btn-ghost !text-xs">
            <Wand2 size={13} />{t('task.aiSplit')}
          </button>
          <button onClick={() => { setShowAdd(v => !v); setShowSplit(false) }} className="btn-primary !text-xs">
            <Plus size={13} />{t('task.add')}
          </button>
        </div>
      </div>

      {/* 概览条 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Flame size={19} className="text-orange-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{streak} {t('task.days')}</div>
            <div className="text-[11px] text-slate-400">{t('task.streak')}</div>
          </div>
        </Card>
        <Card className="!p-4 flex-1 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">{t('task.weekBar')}</span>
            <span className="text-xs text-slate-400">{done.length}/{tasks.length} · {progress}%</span>
          </div>
          <ProgressBar value={progress} tone="bg-violet-500" />
        </Card>
      </div>

      {/* AI 拆解面板 */}
      {showSplit && (
        <Card className="fade-in border-violet-200 bg-violet-50/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 mb-3">
            <Wand2 size={15} />{t('task.aiSplit')}
          </div>
          <div className="flex gap-2">
            <input value={splitGoal} onChange={e => setSplitGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSplit()}
              placeholder={t('task.aiSplitPlaceholder')} className="input flex-1" />
            <button onClick={doSplit} className="btn-primary">{t('task.splitBtn')}</button>
          </div>
          <p className="mt-2 text-[11px] text-violet-500">
            {lang === 'zh' ? '示例：输入「准备机器学习期末考试」，AI 会拆成知识点、练习题、错题复盘、模拟测试等子任务。' : 'AI will split your goal into sub-tasks with estimated time and due dates.'}
          </p>
        </Card>
      )}

      {/* 新增任务面板 */}
      {showAdd && (
        <Card className="fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">{t('task.add')}</div>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 min-w-0">
              <label className="label">{t('task.fTitle')}</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder={t('task.newTitle')} className="input" />
            </div>
            <div className="col-span-2 min-w-0">
              <label className="label">{t('task.fCourse')}</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} className="input">
                <option value="">{lang === 'zh' ? '不关联课程' : 'No course'}</option>
                {getCourses().map(c => <option key={c.id} value={c.id}>{lang === 'zh' ? c.name : c.nameEn}</option>)}
              </select>
            </div>
            <div className="col-span-1 min-w-0">
              <label className="label">{t('task.fPriority')}</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as StudyTask['priority'] }))} className="input">
                {(['high', 'medium', 'low'] as const).map(p => <option key={p} value={p}>{t(`common.${p}`)}</option>)}
              </select>
            </div>
            <div className="col-span-1 min-w-0">
              <label className="label">{t('task.fEst')}</label>
              <input type="number" min={5} step={5} value={form.est}
                onChange={e => setForm(f => ({ ...f, est: Number(e.target.value) }))} className="input" />
            </div>
            <div className="col-span-2 min-w-0">
              <label className="label">{t('task.fDue')}</label>
              <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} className="input" />
            </div>
          </div>
          <button onClick={addTask} className="btn-primary mt-3 w-full"><Plus size={14} />{t('task.add')}</button>
        </Card>
      )}

      {/* 任务分组：列数按可用宽度自适应（每列不小于 240px），避免窄屏被挤成竖排字 */}
      <div className="grid-auto-fit gap-5">
        {groups.map(g => (
          <Card key={g.key}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">{t(g.key)}</span>
              <Badge tone={g.tone}>{g.items.length}</Badge>
            </div>
            <div className="space-y-2">
              {g.items.length === 0
                ? <EmptyState text={g.key === 'task.today' ? t('task.emptyToday') : undefined} />
                : g.items.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default StudyTasks
