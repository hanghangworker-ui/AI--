// SQLite 数据库连接与建表（Node 22 内置 node:sqlite，零原生依赖）
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(__dirname, '..', 'data')
mkdirSync(DATA_DIR, { recursive: true })
export const DB_PATH = path.join(DATA_DIR, 'campusflow.db')

export const db = new DatabaseSync(DB_PATH)

// WAL 模式：读写并发更稳
db.exec('PRAGMA journal_mode = WAL;')

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  student_no TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  grade TEXT, major TEXT, email TEXT,
  hist_gpa REAL DEFAULT 8.5,
  hist_credits REAL DEFAULT 30,
  grants TEXT DEFAULT '{}',
  notif_prefs TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, name_en TEXT, teacher TEXT,
  credits REAL NOT NULL, color TEXT
);
CREATE TABLE IF NOT EXISTS timetable (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  day INTEGER NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
  room TEXT, kind TEXT DEFAULT 'lecture',
  status TEXT DEFAULT 'normal',
  conflict_with TEXT,
  alt_json TEXT
);
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT, score REAL, date TEXT, weight REAL
);
CREATE TABLE IF NOT EXISTS course_grades (
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  current_score REAL, trend TEXT,
  PRIMARY KEY (student_id, course_id)
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  course_id TEXT,
  estimated_min INTEGER DEFAULT 30,
  due_date TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  from_ai INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT, body TEXT, level TEXT DEFAULT 'info',
  date TEXT, read INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT, content TEXT, time TEXT,
  actions_json TEXT, data_used_json TEXT, fallback INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tt_student ON timetable(student_id);
CREATE INDEX IF NOT EXISTS idx_att_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON chat_messages(conversation_id);
`)

// ---------- 小工具 ----------
export const all = (sql, ...params) => db.prepare(sql).all(...params)
export const get = (sql, ...params) => db.prepare(sql).get(...params)
export const run = (sql, ...params) => db.prepare(sql).run(...params)
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
