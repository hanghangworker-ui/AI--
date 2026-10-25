// 个人设置：资料 / 语言 / AI 接口 / 数据授权 / 通知偏好 / 退出登录
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, User, Languages, Bot, ShieldCheck,
  Bell, LogOut, Save, GraduationCap, Mail, Hash,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, toast } from '../components/ui'
import type { AIProviderConfig } from '../types'
import { getStudent, getAIConfig, saveAIConfig, logout } from '../services/studentService'

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }> = ({ on, onChange, label, desc }) => (
  <label className="flex items-center justify-between gap-4 py-2.5 cursor-pointer">
    <div>
      <div className="text-sm text-slate-700">{label}</div>
      {desc && <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>}
    </div>
    <button type="button" onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary-600' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </label>
)

const Settings: React.FC = () => {
  const { t, lang, setLang } = useI18n()
  const nav = useNavigate()
  const stu = getStudent()
  const [cfg, setCfg] = React.useState<AIProviderConfig>(() => getAIConfig())
  const [notif, setNotif] = React.useState(() => ({ risk: true, exam: true, daily: false }))

  const save = () => {
    saveAIConfig(cfg)
    toast(t('set.saved'))
  }

  const doLogout = () => {
    logout()
    nav('/login', { replace: true })
  }

  const providerOptions: { value: AIProviderConfig['provider']; label: string }[] = [
    { value: 'builtin', label: t('ai.builtin') },
    { value: 'dify', label: 'Dify Chat Messages' },
    { value: 'deepseek', label: 'DeepSeek Chat Completions' },
    { value: 'openai', label: 'OpenAI 兼容接口' },
  ]

  return (
    <div className="fade-in space-y-5 max-w-3xl">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <SettingsIcon size={19} className="text-primary-500" />{t('set.title')}
      </h1>

      {/* 学生资料 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
          <User size={15} className="text-primary-500" />{t('set.profile')}
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${stu.avatarColor} flex items-center justify-center text-white text-xl font-bold`}>
            {stu.name[0]}
          </div>
          <div>
            <div className="font-bold text-slate-800">{stu.name}</div>
            <div className="text-xs text-slate-400">{stu.studentNo} · {stu.major}</div>
          </div>
          <Badge tone="primary" className="!ml-auto">{stu.grade}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1"><Hash size={11} />{t('login.username')}</div>
            <div className="text-slate-700 mt-1">{stu.studentNo}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1"><GraduationCap size={11} />{lang === 'zh' ? '专业' : 'Major'}</div>
            <div className="text-slate-700 mt-1">{stu.major}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1"><Mail size={11} />{lang === 'zh' ? '邮箱' : 'Email'}</div>
            <div className="text-slate-700 mt-1 truncate">{stu.email}</div>
          </div>
        </div>
      </Card>

      {/* 语言 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Languages size={15} className="text-primary-500" />{t('set.lang')}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLang('zh')} className={`btn-ghost ${lang === 'zh' ? '!bg-primary-600 !text-white' : ''}`}>中文</button>
          <button onClick={() => setLang('en')} className={`btn-ghost ${lang === 'en' ? '!bg-primary-600 !text-white' : ''}`}>English</button>
        </div>
      </Card>

      {/* AI 服务与接口 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
          <Bot size={15} className="text-primary-500" />{t('set.aiConfig')}
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t('ai.provider')}</label>
            <select value={cfg.provider} onChange={e => setCfg(c => ({ ...c, provider: e.target.value as AIProviderConfig['provider'] }))} className="input">
              {providerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {cfg.provider !== 'builtin' && (
            <>
              <div>
                <label className="label">{t('set.baseUrl')}</label>
                <input value={cfg.baseUrl} onChange={e => setCfg(c => ({ ...c, baseUrl: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">{t('set.apiKey')}</label>
                <input type="password" value={cfg.apiKey} placeholder="sk-..."
                  onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))} className="input" />
                <p className="mt-1 text-[11px] text-amber-500">{t('set.demoKey')}</p>
              </div>
              <div>
                <label className="label">{t('set.model')}</label>
                <input value={cfg.model} onChange={e => setCfg(c => ({ ...c, model: e.target.value }))} className="input" />
              </div>
            </>
          )}
          <button onClick={save} className="btn-primary"><Save size={14} />{t('common.save')}</button>
        </div>
      </Card>

      {/* 数据授权 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-teal-500" />{t('set.grants')}
        </div>
        <p className="text-[11px] text-slate-400 mb-1">{lang === 'zh' ? '关闭后，AI 助手在对话中无法读取对应类别的数据，并在回答中如实说明。' : 'When off, the AI cannot read that data category in conversations.'}</p>
        <div className="divide-y divide-slate-50">
          <Toggle on={cfg.grants.timetable} label={t('g.timetable')} onChange={v => setCfg(c => ({ ...c, grants: { ...c.grants, timetable: v } }))} />
          <Toggle on={cfg.grants.attendance} label={t('g.attendance')} onChange={v => setCfg(c => ({ ...c, grants: { ...c.grants, attendance: v } }))} />
          <Toggle on={cfg.grants.grades} label={t('g.grades')} onChange={v => setCfg(c => ({ ...c, grants: { ...c.grants, grades: v } }))} />
          <Toggle on={cfg.grants.tasks} label={t('g.tasks')} onChange={v => setCfg(c => ({ ...c, grants: { ...c.grants, tasks: v } }))} />
        </div>
        <button onClick={save} className="btn-primary mt-3"><Save size={14} />{t('common.save')}</button>
      </Card>

      {/* 通知偏好 */}
      <Card>
        <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Bell size={15} className="text-amber-500" />{t('set.notif')}
        </div>
        <div className="divide-y divide-slate-50">
          <Toggle on={notif.risk} label={t('set.notifRisk')} onChange={v => setNotif(n => ({ ...n, risk: v }))} />
          <Toggle on={notif.exam} label={t('set.notifExam')} onChange={v => setNotif(n => ({ ...n, exam: v }))} />
          <Toggle on={notif.daily} label={t('set.notifDaily')} onChange={v => setNotif(n => ({ ...n, daily: v }))} />
        </div>
      </Card>

      {/* 退出登录 */}
      <Card className="!p-4">
        <button onClick={doLogout} className="btn-danger w-full">
          <LogOut size={15} />{t('common.logout')}
        </button>
      </Card>
    </div>
  )
}

export default Settings
