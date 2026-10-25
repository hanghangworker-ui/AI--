// AI 学生助手：全屏聊天 + 历史对话 + 快捷提问 + Provider 抽象 + 本地回退 + 操作按钮
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Send, Plus, History, MessageSquare, ArrowRight, Settings2,
  ShieldAlert, Database, Sparkles, Trash2,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, EmptyState, LoadingView } from '../components/ui'
import type { AIConversation, ChatMessage } from '../types'
import { getConversations, saveConversations, getAIConfig } from '../services/studentService'
import { askAI } from '../services/aiService'

const uid = () => Math.random().toString(36).slice(2, 10)

const AIChat: React.FC = () => {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const cfg = getAIConfig()

  const [convos, setConvos] = React.useState<AIConversation[]>(() => getConversations())
  const [activeId, setActiveId] = React.useState<string>(() => getConversations()[0]?.id ?? '')
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)

  const active = convos.find(c => c.id === activeId)

  const persist = (next: AIConversation[]) => {
    setConvos(next)
    saveConversations(next)
  }

  const pushMsg = (convId: string, msg: ChatMessage) => {
    persist(convos.map(c => c.id === convId ? { ...c, messages: [...c.messages, msg] } : c))
  }

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || sending) return
    setInput('')
    setSending(true)

    // 若当前无会话则新建
    let convId = activeId
    if (!active) {
      const conv: AIConversation = { id: uid(), title: q.slice(0, 16), createdAt: new Date().toISOString(), messages: [] }
      persist([conv, ...convos])
      convId = conv.id
      setActiveId(conv.id)
    } else {
      // 更新标题（若为首条消息）
      if (active.messages.length === 0) persist(convos.map(c => c.id === convId ? { ...c, title: q.slice(0, 16) } : c))
    }
    const time = new Date().toTimeString().slice(0, 5)
    pushMsg(convId, { id: uid(), role: 'user', content: q, time })

    try {
      const answer = await askAI(q, getAIConfig(), { lang })
      pushMsg(convId, {
        id: uid(), role: 'assistant', content: answer.content, time,
        actions: answer.actions, fallback: answer.fallback, dataUsed: answer.dataUsed,
      })
    } catch {
      pushMsg(convId, { id: uid(), role: 'assistant', content: t('common.error'), time, fallback: true })
    } finally {
      setSending(false)
    }
  }

  const newChat = () => {
    const conv: AIConversation = { id: uid(), title: lang === 'zh' ? '新对话' : 'New chat', createdAt: new Date().toISOString(), messages: [] }
    persist([conv, ...convos])
    setActiveId(conv.id)
  }

  const delChat = (id: string) => {
    const next = convos.filter(c => c.id !== id)
    persist(next)
    if (activeId === id) setActiveId(next[0]?.id ?? '')
  }

  const quicks = [t('ai.q1'), t('ai.q2'), t('ai.q3'), t('ai.q4')]

  return (
    <div className="fade-in">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center">
            <Bot size={19} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{t('ai.title')}</h1>
            <p className="text-[11px] text-slate-400">
              {cfg.provider === 'builtin' ? t('ai.builtin')
                : `${cfg.provider} · ${cfg.model}${cfg.apiKey ? '' : (lang === 'zh' ? ' · 未配置密钥，将使用本地问答' : ' · no key, local Q&A')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(v => !v)} className="btn-ghost !px-3"><History size={15} /></button>
          <button onClick={newChat} className="btn-primary !px-3.5"><Plus size={15} />{t('ai.newChat')}</button>
        </div>
      </div>

      {/* 历史抽屉 */}
      {showHistory && (
        <Card className="mb-4 fade-in !py-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">{t('ai.history')}</div>
          <div className="space-y-1">
            {convos.length === 0 && <p className="text-xs text-slate-400 py-2">{t('common.empty')}</p>}
            {convos.map(c => (
              <div key={c.id} className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                c.id === activeId ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-600'
              }`} onClick={() => { setActiveId(c.id); setShowHistory(false) }}>
                <MessageSquare size={14} className="shrink-0 opacity-60" />
                <span className="truncate flex-1">{c.title}</span>
                <button onClick={e => { e.stopPropagation(); delChat(c.id) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 聊天区 */}
      <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" id="chat-scroll">
          {!active || active.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                <Bot size={30} className="text-primary-400" />
              </div>
              <p className="text-sm">{lang === 'zh' ? '你好，李明！问我课程、考勤、成绩或学习计划' : 'Hi! Ask me about courses, attendance, grades or plans'}</p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {quicks.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-left text-xs md:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 text-slate-600 transition-all">
                    <Sparkles size={13} className="inline mr-1.5 text-primary-400" />{q}
                  </button>
                ))}
              </div>
            </div>
          ) : active.messages.map(m => (
            <div key={m.id} className={`flex gap-3 fade-in ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                m.role === 'user' ? 'bg-primary-500' : 'bg-gradient-to-br from-primary-600 to-teal-500'
              }`}>
                {m.role === 'user' ? '李' : <Bot size={15} />}
              </div>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block text-left text-sm leading-relaxed px-4 py-2.5 rounded-2xl ${
                  m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-slate-50 text-slate-700 rounded-tl-sm border border-slate-100'
                }`}>
                  {m.content.split('\n').map((line, i) => <p key={i} className={line.startsWith('⚠️') ? 'text-amber-600 text-xs mb-2' : 'mb-1 last:mb-0'}>{line}</p>)}
                </div>
                {/* 引用数据 */}
                {m.role === 'assistant' && m.dataUsed && m.dataUsed.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <Database size={11} className="text-slate-300" />
                    {m.dataUsed.map(d => <span key={d} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{d}</span>)}
                  </div>
                )}
                {m.role === 'assistant' && m.fallback && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-500">
                    <ShieldAlert size={11} />{lang === 'zh' ? '本地问答' : 'local Q&A'}
                  </div>
                )}
                {/* 操作按钮 */}
                {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map(a => (
                      <button key={a.to + a.label} onClick={() => nav(a.to)}
                        className="chip bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer">
                        {a.label}<ArrowRight size={11} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-slate-300 mt-1">{m.time}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 fade-in">
              <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center">
                <Bot size={15} className="text-white animate-pulse" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <LoadingView />
              </div>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-slate-100 p-3 md:px-4">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder={t('ai.placeholder')} className="input flex-1" disabled={sending} />
            <button onClick={() => send()} disabled={sending || !input.trim()} className="btn-primary !px-4">
              <Send size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex gap-1.5 overflow-x-auto">
              {quicks.map(q => (
                <button key={q} onClick={() => send(q)} disabled={sending}
                  className="shrink-0 text-[11px] text-slate-400 hover:text-primary-600 border border-slate-100 rounded-full px-2.5 py-1 hover:border-primary-200 transition-colors">
                  {q}
                </button>
              ))}
            </div>
            <button onClick={() => nav('/settings')} className="shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-600 transition-colors">
              <Settings2 size={12} />{t('ai.setting')}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
        <ShieldAlert size={11} />{t('common.aiHint')}
      </p>
    </div>
  )
}

export default AIChat
