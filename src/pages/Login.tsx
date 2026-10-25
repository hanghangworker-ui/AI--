// 登录/注册页：价值主张 + 账号登录 + 新学生注册 + 演示账号 + 中英切换 + 隐私说明
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Lock, User, Sparkles, ShieldCheck, UserPlus, CheckSquare, Square } from 'lucide-react'
import { useI18n } from '../i18n'
import { setLogin, hydrateFromServer } from '../services/studentService'
import { apiLogin, apiRegister, ApiError } from '../services/api'

type Mode = 'login' | 'register'

const Login: React.FC = () => {
  const { t, lang, setLang } = useI18n()
  const nav = useNavigate()
  const [mode, setMode] = React.useState<Mode>('login')
  const [user, setUser] = React.useState('')
  const [pass, setPass] = React.useState('')
  // 注册表单
  const [rNo, setRNo] = React.useState('')
  const [rName, setRName] = React.useState('')
  const [rPass, setRPass] = React.useState('')
  const [rPass2, setRPass2] = React.useState('')
  const [importDemo, setImportDemo] = React.useState(true)
  const [err, setErr] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  /** 登录：后端验证通过 → 拉数据；后端离线 → 降级本地演示模式 */
  const enter = async (studentNo: string, password: string): Promise<'ok' | 'badcred' | 'offline'> => {
    try {
      await apiLogin(studentNo, password)
      setLogin(true)
      await hydrateFromServer() // 从 SQLite 拉取全量数据
      return 'ok'
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return 'badcred'
      // 后端离线：降级为本地演示模式
      setLogin(true)
      return 'offline'
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user.trim() || !pass.trim()) { setErr(t('login.errEmpty')); return }
    setLoading(true)
    setErr('')
    const r = await enter(user.trim(), pass)
    setLoading(false)
    if (r === 'badcred') {
      setErr(lang === 'zh' ? '学号或密码不正确（后端验证失败）' : 'Invalid credentials (rejected by server)')
      return
    }
    nav('/', { replace: true })
  }

  const demoLogin = async () => {
    setUser('ST2026001')
    setPass('demo123')
    setLoading(true)
    await enter('ST2026001', 'demo123')
    setLoading(false)
    nav('/', { replace: true })
  }

  /** 注册：必须连接后端（数据写入 SQLite）；成功即登录 */
  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    const no = rNo.trim(), nick = rName.trim()
    if (!no || !nick || !rPass) { setErr(t('reg.errEmpty')); return }
    if (rPass.length < 6) { setErr(t('reg.errShort')); return }
    if (rPass !== rPass2) { setErr(t('reg.errMismatch')); return }
    setLoading(true)
    setErr('')
    try {
      await apiRegister(no, nick, rPass, importDemo)
      setLogin(true)
      await hydrateFromServer() // 注册学生数据（含复制的演示课表）拉到本地
      nav('/', { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        // 409 学号已注册 / 400 校验失败（服务端 message 为中文，界面语言为英文时用本地词条）
        if (e.status === 409) setErr(t('reg.errDup'))
        else if (lang === 'en') setErr(e.status === 400 ? t('reg.errShort') : t('common.error'))
        else setErr(e.serverMessage || t('common.error'))
      } else {
        // 网络失败：注册依赖后端数据库，不提供离线降级
        setErr(t('reg.needBackend'))
      }
      setLoading(false)
    }
  }

  const switchMode = (m: Mode) => { setMode(m); setErr('') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-primary-950 via-primary-700 to-teal-800">
      {/* 左侧：品牌区 */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-20 py-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <GraduationCap size={26} />
            </div>
            <div>
              <div className="text-2xl font-bold">CampusFlow AI</div>
              <div className="text-teal-200 text-sm">{t('app.tagline')}</div>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-snug max-w-lg">
            {lang === 'zh' ? '打开网页，就知道今天该做什么' : 'Open the page, know what to do today'}
          </h1>
          <p className="mt-4 text-teal-100/80 text-sm leading-relaxed max-w-md">{t('app.subtitle')}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {(lang === 'zh'
              ? ['今日学习驾驶舱', '学习健康度评分', '目标反推计划', 'AI 对话联动页面', '考勤风险预警']
              : ['Daily dashboard', 'Study health score', 'Backward goal planning', 'AI-page actions', 'Attendance alerts']
            ).map(x => (
              <span key={x} className="chip bg-white/10 text-white border border-white/15 px-3 py-1">
                <Sparkles size={12} className="text-teal-300" />{x}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：登录 / 注册卡 */}
      <div className="w-full md:w-[440px] flex items-center justify-center p-6 bg-white md:rounded-l-[32px] rounded-t-[32px] md:rounded-tr-none">
        <div className="w-full max-w-sm fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{mode === 'login' ? t('login.welcome') : t('reg.title')}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? (lang === 'zh' ? '学生端登录' : 'Student sign in')
                  : (lang === 'zh' ? '新学生注册' : 'New student sign up')}
              </p>
            </div>
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="h-8 px-3 rounded-full border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50">
              {t('common.language')}
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">{t('login.username')}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input !pl-9" value={user} onChange={e => setUser(e.target.value)}
                      placeholder={t('login.placeholderUser')} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('login.password')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" className="input !pl-9" value={pass} onChange={e => setPass(e.target.value)}
                      placeholder={t('login.placeholderPass')} />
                  </div>
                </div>
                {err && <p className="text-xs text-red-500">{err}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
                  {loading ? t('common.loading') : t('login.btn')}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-300">
                <div className="h-px flex-1 bg-slate-100" />
                {lang === 'zh' ? '或' : 'or'}
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <button onClick={demoLogin} disabled={loading}
                className="w-full py-2.5 rounded-lg border-2 border-dashed border-primary-200 text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors">
                <Sparkles size={15} className="inline mr-1 -mt-0.5" />{t('login.demo')}
              </button>

              <button onClick={() => switchMode('register')}
                className="mt-5 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium">
                {t('reg.toRegister')}
              </button>
            </>
          ) : (
            <>
              <form onSubmit={register} className="space-y-4">
                <div>
                  <label className="label">{t('login.username')}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input !pl-9" value={rNo} onChange={e => setRNo(e.target.value)}
                      placeholder={t('login.placeholderUser')} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('reg.name')}</label>
                  <div className="relative">
                    <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input !pl-9" value={rName} onChange={e => setRName(e.target.value)}
                      placeholder={t('reg.namePh')} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('login.password')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" className="input !pl-9" value={rPass} onChange={e => setRPass(e.target.value)}
                      placeholder={t('login.placeholderPass')} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('reg.confirmPass')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" className="input !pl-9" value={rPass2} onChange={e => setRPass2(e.target.value)}
                      placeholder={t('reg.confirmPh')} />
                  </div>
                </div>
                <button type="button" onClick={() => setImportDemo(v => !v)}
                  className="flex items-start gap-2 text-left text-xs text-slate-500 hover:text-slate-700 w-full">
                  {importDemo
                    ? <CheckSquare size={16} className="shrink-0 text-primary-500 mt-0.5" />
                    : <Square size={16} className="shrink-0 text-slate-300 mt-0.5" />}
                  {t('reg.importDemo')}
                </button>
                {err && <p className="text-xs text-red-500">{err}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
                  {loading ? t('common.loading') : t('reg.btn')}
                </button>
              </form>

              <button onClick={() => switchMode('login')}
                className="mt-5 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium">
                {t('reg.toLogin')}
              </button>
            </>
          )}

          <p className="mt-6 text-[11px] text-slate-400 leading-relaxed flex gap-1.5">
            <ShieldCheck size={14} className="shrink-0 mt-0.5 text-teal-500" />{t('login.privacy')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
