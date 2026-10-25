// 通用 UI 组件：卡片、徽章、环形进度、空态/加载态/错误态、Toast
import React from 'react'
import { AlertCircle, Inbox, Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useI18n } from '../i18n'

export const Card: React.FC<{ className?: string; children: React.ReactNode; hover?: boolean }> = ({ className = '', children, hover }) => (
  <div className={`card p-5 ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
)

export const SectionTitle: React.FC<{ icon?: React.ReactNode; title: string; right?: React.ReactNode }> = ({ icon, title, right }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
      {icon}{title}
    </h2>
    {right}
  </div>
)

export const Badge: React.FC<{ tone?: 'primary' | 'green' | 'amber' | 'red' | 'slate' | 'violet'; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className = '' }) => {
  const map = {
    primary: 'bg-primary-50 text-primary-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-50 text-violet-700',
  }
  return <span className={`chip ${map[tone]} ${className}`}>{children}</span>
}

export const TrendBadge: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
  const { t } = useI18n()
  if (trend === 'up') return <span className="chip bg-emerald-50 text-emerald-600"><TrendingUp size={13} />{t('gr.trendUp')}</span>
  if (trend === 'down') return <span className="chip bg-red-50 text-red-500"><TrendingDown size={13} />{t('gr.trendDown')}</span>
  return <span className="chip bg-slate-100 text-slate-500"><Minus size={13} />{t('gr.trendFlat')}</span>
}

/** 环形进度（学习健康度等） */
export const RingProgress: React.FC<{ value: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string }> = ({
  value, size = 132, stroke = 11, color = '#1d40d0', label, sub,
}) => {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c
  const tone = value >= 75 ? '#0d9488' : value >= 55 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-800">{label ?? value}</span>
        {sub && <span className="text-xs text-slate-400 mt-0.5">{sub}</span>}
      </div>
    </div>
  )
}

export const ProgressBar: React.FC<{ value: number; tone?: string; className?: string }> = ({ value, tone = 'bg-primary-500', className = '' }) => (
  <div className={`h-2 rounded-full bg-slate-100 overflow-hidden ${className}`}>
    <div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
)

export const EmptyState: React.FC<{ text?: string; children?: React.ReactNode }> = ({ text, children }) => {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
      <Inbox size={36} strokeWidth={1.4} />
      <p className="text-sm">{text ?? t('common.empty')}</p>
      {children}
    </div>
  )
}

export const LoadingView: React.FC = () => {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
      <Loader2 size={32} className="animate-spin" />
      <p className="text-sm">{t('common.loading')}</p>
    </div>
  )
}

export const ErrorView: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <AlertCircle size={36} className="text-red-400" />
      <p className="text-sm">{t('common.error')}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>{t('common.error')}</button>}
    </div>
  )
}

// 全局轻量 Toast
let toastFn: ((msg: string) => void) | null = null
export const toast = (msg: string) => toastFn?.(msg)

export const ToastHost: React.FC = () => {
  const [msgs, setMsgs] = React.useState<{ id: number; msg: string }[]>([])
  React.useEffect(() => {
    toastFn = (msg: string) => {
      const id = Date.now() + Math.random()
      setMsgs(m => [...m, { id, msg }])
      setTimeout(() => setMsgs(m => m.filter(x => x.id !== id)), 2600)
    }
    return () => { toastFn = null }
  }, [])
  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {msgs.map(m => (
        <div key={m.id} className="fade-in flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-400" />{m.msg}
        </div>
      ))}
    </div>
  )
}

// 课程配色
export const COURSE_COLORS: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', ring: 'border-indigo-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', ring: 'border-teal-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', ring: 'border-violet-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500', ring: 'border-sky-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'border-amber-200' },
}
