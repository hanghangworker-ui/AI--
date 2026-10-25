// 认证：JWT 签发与校验中间件；.env 读取（零依赖手写解析）
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------- 轻量 .env 加载（不引 dotenv） ----------
export function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

export const JWT_SECRET = () => process.env.JWT_SECRET || 'campusflow-demo-secret-change-me'
export const AI_API_KEY = () => process.env.AI_API_KEY || ''
export const AI_BASE_URL = () => process.env.AI_BASE_URL || ''
export const AI_MODEL = () => process.env.AI_MODEL || 'deepseek-chat'

export function signToken(student) {
  return jwt.sign({ id: student.id, no: student.student_no }, JWT_SECRET(), { expiresIn: '12h' })
}

/** requireAuth：校验 Authorization: Bearer <token>，挂 req.studentId */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'unauthorized', message: '请先登录' })
  try {
    const payload = jwt.verify(token, JWT_SECRET())
    req.studentId = payload.id
    next()
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: '登录已过期，请重新登录' })
  }
}
