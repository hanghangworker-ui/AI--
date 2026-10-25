// CampusFlow AI 本地后端入口：SQLite + JWT 登录 + 数据同步 + AI 密钥代理 + 静态托管前端 dist
import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from './auth.js'
import { seedIfEmpty } from './seed.js'
import { DB_PATH } from './db.js'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/student.js'
import syncRoutes from './routes/sync.js'
import aiRoutes from './routes/ai.js'

loadEnv()
seedIfEmpty(process.argv.includes('--reset')) // 空库自动初始化演示数据

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '2mb' }))

// ---------- API ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: path.basename(DB_PATH), time: new Date().toISOString() })
})
app.use('/api/auth', authRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/ai', aiRoutes)

// API 404
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: '接口不存在' }))

// ---------- 静态托管前端构建产物 ----------
const distDir = path.join(__dirname, '..', '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  // HashRouter 无需 history fallback，但兜底更稳
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
} else {
  app.get('*', (_req, res) => res.send('CampusFlow API 运行中。前端 dist 未构建：请先在项目根目录执行 npm run build。'))
}

const PORT = Number(process.env.PORT || 3001)
app.listen(PORT, () => {
  console.log('┌─────────────────────────────────────────────')
  console.log('│  CampusFlow AI 后端已启动')
  console.log(`│  地址     http://127.0.0.1:${PORT}`)
  console.log(`│  数据库   ${DB_PATH}`)
  console.log(`│  AI 密钥  ${process.env.AI_API_KEY ? '已在服务端 .env 配置（代理模式）' : '未配置（内置规则问答模式）'}`)
  console.log('│  演示账号 ST2026001 / demo123')
  console.log('└─────────────────────────────────────────────')
})
