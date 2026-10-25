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

  const groups: { key: string; items: StudyTask[] }[] = [
    { key: 'task.today', items: tasks.filter(x => x.status !== 'done' && x.dueDate <= todayISO) },
    { key: 'task.doing', items: tasks.filter(x => x.status === 'doing') },
    { key: 'task.finished', items: done },
  ]

  const TaskRow: React.FC<{ task: StudyTask }> = ({ task }) => {
    const c = task.courseId ? courseById(task.courseId) : null
    const color = c ? COURSE_COLORS[c.color] ?? COURSE_COLORS.indigo : null
    const dueSoon = task.status !== 'done' && task.dueDate <= addDaysISO(1)
    return (
      <div className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
        task.status === 'done' ? 'bg-slate-50/60' : 'bg-white hover:bg-primary-50/30 border border-slate-100'
      }`}>
        {/* 状态按钮 */}
        {task.status === 'done' ? (
          <button onClick={() => setStatus(task.id, 'todo')} className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check size={13} />
          </button>
        ) : (
          <button onClick={() => setStatus(task.id, task.status === 'doing' ? 'done' : 'doing')}
            className="w-6 h-6 rounded-full border-2 border-slate-200 hover:border-emerald-400 flex items-center justify-center shrink-0 transition-colors">
            {task.status === 'doing' && <Play size={11} className="text-primary-500" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-sm truncate ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
            {task.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
            {c && <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${color!.dot}`} />{lang === 'zh' ? c.name : c.nameEn}</span>}
            <span className="flex items-center gap-1"><Clock3 size={11} />{t('task.est')} {task.estimatedMin} {t('common.minutes')}</span>
            <span className={`flex items-center gap-1 ${dueSoon ? 'text-amber-500 font-medium' : ''}`}>
              <CalendarDays size={11} />{t('task.due')} {task.dueDate.slice(5)}
            </span>
            {task.fromAI && <Badge tone="violet"><Sparkles size={10} />{t('task.fromAI')}</Badge>}
          </div>
        </div>
        <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'slate'}>
          {t(`common.${task.priority}`)}
        </Badge>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => editTask(task)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil size={13} /></button>
          <button onClick={() => delTask(task.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder={t('task.newTitle')} className="input md:col-span-2" />
            <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} className="input">
              <option value="">{lang === 'zh' ? '关联课程（选填）' : `Course (${t('common.optional')})`}</option>
              {getCourses().map(c => <option key={c.id} value={c.id}>{lang === 'zh' ? c.name : c.nameEn}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as StudyTask['priority'] }))} className="input">
              {(['high', 'medium', 'low'] as const).map(p => <option key={p} value={p}>{t(`common.${p}`)}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" min={5} step={5} value={form.est} title={t('task.est')}
                onChange={e => setForm(f => ({ ...f, est: Number(e.target.value) }))} className="input !w-20" />
              <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} className="input flex-1" />
            </div>
          </div>
          <button onClick={addTask} className="btn-primary mt-3 w-full"><Plus size={14} />{t('task.add')}</button>
        </Card>
      )}

      {/* 任务分组 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {groups.map(g => (
          <Card key={g.key}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">{t(g.key)}</span>
              <Badge tone={g.key === 'task.finished' ? 'green' : g.key === 'task.doing' ? 'primary' : 'amber'}>{g.items.length}</Badge>
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
