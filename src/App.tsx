import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider, type Lang } from './i18n'
import { loadLS, saveLS } from './services/storage'
import { isLoggedIn } from './services/studentService'
import AppShell from './components/AppShell'
import { ToastHost } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AIChat from './pages/AIChat'
import Timetable from './pages/Timetable'
import Grades from './pages/Grades'
import Attendance from './pages/Attendance'
import CGPAPlanner from './pages/CGPAPlanner'
import StudyTasks from './pages/StudyTasks'
import CareerExplorer from './pages/CareerExplorer'
import Settings from './pages/Settings'

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App: React.FC = () => {
  const [lang, setLangState] = React.useState<Lang>(() => loadLS<Lang>('lang', 'zh'))
  const setLang = (l: Lang) => { setLangState(l); saveLS('lang', l) }

  return (
    <LangProvider lang={lang} setLang={setLang}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/aichat" element={<AIChat />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/cgpa" element={<CGPAPlanner />} />
            <Route path="/tasks" element={<StudyTasks />} />
            <Route path="/career" element={<CareerExplorer />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastHost />
      </HashRouter>
    </LangProvider>
  )
}

export default App
