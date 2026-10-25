// 全局布局：桌面左侧导航 + 移动端底部导航 + 顶栏（问候/日期/通知/语言/头像）
import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, CalendarDays, LineChart, ClipboardCheck,
  Target, ListChecks, Compass, Settings, Bell, LogOut, GraduationCap, ChevronRight,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { getStudent, logout, getNotifications } from '../services/studentService'

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/aichat', key: 'nav.aichat', icon: Bot },
  { to: '/timetable', key: 'nav.timetable', icon: CalendarDays },
  { to: '/grades', key: 'nav.grades', icon: LineChart },
  { to: '/attendance', key: 'nav.attendance', icon: ClipboardCheck },
  { to: '/cgpa', key: 'nav.cgpa', icon: Target },
  { to: '/tasks', key: 'nav.tasks', icon: ListChecks },
  { to: '/career', key: 'nav.career', icon: Compass },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

const AppShell: React.FC = () => {
  const { t, lang, setLang } = useI18n()
  const nav = useNavigate()
  const stu = getStudent()
  const notifs = getNotifications()
  const unread = notifs.filter(n => !n.read).length

  const [showNotif, setShowNotif] = React.useState(false)
  const [notifList, setNotifList] = React.useState(notifs)

  const dateStr = new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long', day: 'numeric', weekday: 'long',
  })

  const handleLogout = () => {
    logout()
    nav('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== 桌面侧导航 ===== */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-slate-100 z-40">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-teal-500 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800 leading-tight">CampusFlow <span className="text-primary-600">AI</span></div>
            <div className="text-[11px] text-slate-400">{t('app.tagline')}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}>
              <item.icon size={18} strokeWidth={2} />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="btn-ghost w-full !text-red-500 hover:!bg-red-50">
            <LogOut size={15} />{t('common.logout')}
          </button>
        </div>
      </aside>

      {/* ===== 顶栏 ===== */}
      <header className="md:pl-60 sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${stu.avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
              {stu.name[0]}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {t('dash.greeting')}，{stu.name}
              </div>
              <div className="text-xs text-slate-400">{dateStr}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 通知 */}
            <div className="relative">
              <button onClick={() => setShowNotif(v => !v)}
                className="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <Bell size={18} />
                {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />}
              </button>
              {showNotif && (
                <div className="fade-in absolute right-0 mt-2 w-80 card !p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold">{t('dash.notifications')}</div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifList.map(n => (
                      <div key={n.id} className={`px-4 py-3 text-sm ${!n.read ? 'bg-primary-50/40' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${n.level === 'risk' ? 'bg-red-500' : n.level === 'warn' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                            {n.title}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">{n.date.slice(5)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* 语言切换 */}
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="h-9 px-3 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              {t('common.language')}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 内容区 ===== */}
      <main className="md:pl-60 px-4 md:px-8 py-6 pb-24 md:pb-10 max-w-[1200px]">
        <Outlet />
      </main>

      {/* ===== 移动端底部导航 ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 flex justify-around px-1 py-1.5">
        {NAV.slice(0, 5).map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] transition-colors ${
              isActive ? 'text-primary-600' : 'text-slate-400'
            }`}>
            <item.icon size={20} />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
        <button onClick={() => nav('/settings')} className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] text-slate-400">
          <Settings size={20} /><span>{t('nav.settings')}</span>
        </button>
      </nav>
    </div>
  )
}

export default AppShell
