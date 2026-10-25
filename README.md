# CampusFlow AI · 学生智能成长平台

只面向学生的个人校园工作台：课程表、考勤、成绩、绩点、学习计划与 AI 助手集中在一个界面，回答三个核心问题——**我今天要完成什么？我的学习状态怎么样？下一步怎么提高？**

## 架构总览

```
浏览器（React SPA）
   │  /api/*（JWT Bearer）
   ▼
Express 后端（server/）
   ├── SQLite 数据库（Node 22 内置 node:sqlite，零原生依赖，WAL 模式）
   ├── JWT 登录 + bcrypt 密码校验
   ├── 学生数据 API + 全量写回同步
   ├── AI 密钥代理（密钥只存服务端 .env）
   └── 静态托管前端 dist（单端口单命令运行）
```

- 前端：React 18 + TypeScript + Vite + Tailwind CSS 3 + Lucide + Recharts（HashRouter）
- 后端：Node 22 + Express + `node:sqlite`（无需安装任何原生模块）
- 降级策略：**后端离线时前端自动回退本地 Mock，页面零感知、永不白屏**

## 快速开始

### 方式一：生产模式（推荐，单端口）

```bash
npm install                 # 前端依赖
npm run build               # 构建前端 → dist/
cd server
npm install                 # 后端依赖（express/jsonwebtoken/bcryptjs）
npm start                   # 启动后端 → http://127.0.0.1:3001
```

> 首次启动会自动初始化 `server/data/campusflow.db` 并导入演示数据。
> 演示账号：**ST2026001 / demo123**（登录页也提供一键登录）。
>
> **注册新学生**：登录页点「没有账号？立即注册」→ 填学号/姓名/密码（≥6 位）→ 注册即登录。
> 默认勾选「导入演示课程数据」，新账号会复制一份完整的课表/考勤/成绩/任务，开箱即体验全部功能；
> 取消勾选则从空数据起步（驾驶舱/健康度等均做空态保护，不出现 NaN）。

### 方式二：开发模式（前后端分离热更新）

```bash
# 终端 1：启动后端（3001）
cd server && npm start

# 终端 2：启动 Vite（5173，/api 自动代理到 3001）
cd .. && npm run dev
```

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `cd server && npm run seed` | 清空并重新导入演示数据（日期以当天为基准重新生成） |
| `node server/scripts/smoke.js` | 后端冒烟测试：登录/鉴权/数据口径/写回/AI 代理/注册（含 409 重复、空数据无 NaN、自动清理）共 21 项 |
| `node scripts/check-groups-live.mjs` | 任务分组回归测试：用真实后端数据校验「今日/进行中/计划中/已完成」互斥且全覆盖（防任务在界面丢失） |
| `node scripts/check-layout.mjs` | 布局宽度推算：验证各视口下分组列宽是否足够（防卡片被挤成逐字竖排） |
| `cd server && npm start -- --reset` | 重置数据库后启动 |

## 布局约定（改样式前必读）

- **`max-w-*` 不要和 `md:pl-60` 写在同一层**。`<main class="md:pl-60 max-w-[1200px]">` 会让侧栏 240px 吃掉宽度预算，内容区被压到 ~896px。正确写法是外层只管内边距、内层容器管 `max-w`。
- 多栏栅格**优先用 `.grid-auto-fit`**（内部 `repeat(auto-fit, minmax(min(100%, var(--col-min, 240px)), 1fr))`），列数跟随容器实际宽度。
  硬编码断点（如 `xl:grid-cols-4`）只看**视口**宽度，侧栏和内边距一吃预算就会把每栏挤到 200px 以下、内容被迫逐字竖排。
  需要更窄的列时传变量：`<div class="grid-auto-fit" style={{ '--col-min': '180px' }}>`。
- 卡片内的横向行布局要有**固定开销预算意识**：状态按钮 24 + 徽章 32 + 操作按钮 56 + 间距 36 ≈ 148px。
  列宽小于 300px 时应改用**堆叠式布局**（标题独占整行、元信息与操作折到第二行）。
- 操作按钮**不要用 `opacity-0 group-hover:opacity-100` 隐藏** —— 触屏没有 hover，且隐藏元素仍占布局宽度。改用常显的弱化配色（`text-slate-300 hover:text-*`）。

## 后端 API 一览

| 方法 & 路径 | 说明 | 鉴权 |
| --- | --- | --- |
| GET `/api/health` | 健康检查（前端启动时探测，决定在线/离线模式） | ✕ |
| POST `/api/auth/login` | 学号+密码登录，返回 JWT（bcrypt 校验，12h 有效） | ✕ |
| POST `/api/auth/register` | 新学生注册（学号唯一 409、密码≥6 位），注册即登录返回 JWT；可选复制演示数据 | ✕ |
| GET `/api/auth/me` | 当前学生信息 | ✓ |
| GET `/api/student/overview` | 全量数据 + 计算摘要（出勤率/SGPA/CGPA/健康度/风险/连续天数） | ✓ |
| PUT `/api/student/settings` | 数据授权、通知偏好（存库，服务端 AI 代理遵守） | ✓ |
| POST `/api/sync/tasks` `timetable` `notifications` `conversations` | 写操作全量同步（前端乐观更新 + 800ms 防抖推送） | ✓ |
| POST `/api/ai/chat` | AI 代理：有 `AI_API_KEY` 则转发远程，失败自动回退内置规则问答（数据来自 SQLite，遵守授权） | ✓ |

## 项目结构

```
campusflow-ai/
├── index.html
├── vite.config.ts               # 开发代理：/api → 127.0.0.1:3001
├── src/                          # ---------- 前端 ----------
│   ├── main.tsx / App.tsx        # 入口 + 路由（登录守卫 + 后端数据水合）
│   ├── i18n.tsx                  # 中英文词典 + LangContext
│   ├── types.ts                  # 数据实体类型（前后端共用结构）
│   ├── data/mockData.ts          # 离线 Mock（后端不可用时兜底）
│   ├── services/
│   │   ├── api.ts                # REST 客户端：health 探测/JWT/水合/防抖同步
│   │   ├── studentService.ts     # 数据读取（远程优先 Mock 兜底）+ 派生计算
│   │   ├── aiService.ts          # AI 调用链：后端代理 → 远程直连 → 本地规则
│   │   ├── plannerService.ts     # SGPA/CGPA + 目标反推 + 报告导出
│   │   └── storage.ts            # localStorage 封装
│   ├── components/               # AppShell 布局 + 通用 UI 组件
│   └── pages/                    # 10 个页面（登录/驾驶舱/AI/课表/成绩/考勤/绩点/任务/职业/设置）
└── server/                       # ---------- 后端 ----------
    ├── package.json              # start 脚本已带 --experimental-sqlite
    ├── .env.example              # 端口 / JWT 密钥 / AI 密钥（复制为 .env 使用）
    ├── data/campusflow.db        # SQLite 数据库文件（gitignore）
    ├── scripts/smoke.js          # 12 项后端冒烟测试
    └── src/
        ├── index.js              # Express 入口：API + 静态托管 dist
        ├── db.js                 # node:sqlite 连接 + 建表
        ├── seed.js               # 演示数据（相对当天动态生成日期）
        ├── auth.js               # .env 加载 / JWT 签发 / requireAuth 中间件
        ├── calc.js                # 出勤率/绩点/健康度/风险/连续天数（服务端计算）
        └── routes/
            ├── auth.js            # 登录
            ├── student.js         # overview + settings
            ├── sync.js            # 任务/课表/通知/会话 全量写回
            └── ai.js              # AI 代理 + 内置规则问答（遵守数据库授权）
```

## 数据库表

`students`（含 bcrypt 密码哈希、历史绩点、数据授权、通知偏好）、`courses`、`timetable`（含冲突对与替代方案）、`attendance`、`exam_results`、`course_grades`、`tasks`、`notifications`、`conversations`、`chat_messages`。全部以 `student_id` 为数据边界，学生只能读写自己的数据。

演示数据口径（与产品计划书一致）：总体出勤率 **87%**，机器学习 **83%**（低于 85% 警戒线），当前 CGPA 约 8.4–8.8（按成绩推导），数据结构期末考试倒计时 12 天。

## AI 接口与密钥安全

1. **推荐：服务端代理模式**。复制 `server/.env.example` 为 `server/.env`，填入 `AI_API_KEY`（支持 DeepSeek / OpenAI 兼容接口）。密钥只存在服务端，前端设置页选择 Provider 后，请求经后端 `/api/ai/chat` 转发。
2. **未配置密钥**：AI 助手使用内置中文规则问答（基于 SQLite 中的真实学生数据回答课程/考勤/成绩/计划问题）。
3. **回退链**：远程失败 → 自动切换本地规则问答 → 明确提示，永不白屏。
4. 前端设置页的 API Key 输入仅作开发调试直连用（localStorage 演示占位），生产环境请留空并一律走后端代理。

## 隐私与安全

- JWT 鉴权：所有学生数据接口需 Bearer Token；错误密码、过期 Token、未授权访问均返回 401
- 数据授权存数据库：设置中关闭「考勤授权」后，服务端 AI 代理同样拒读考勤数据，回答会如实说明
- 前端不硬编码任何密钥；SQLite 数据库文件不提交版本库
- 所有 AI 生成内容均标注"仅供参考"
- 管理后台/教师端按计划书另行开发，不放入学生端；学生端保持"只能读取自己的数据"的边界

## 已知说明

- `node:sqlite` 在 Node 22 中为实验特性（启动时会打印一行 ExperimentalWarning，不影响使用；Node 24+ 转正）。如需消除警告或替换为 `better-sqlite3`，只需改 `db.js` 一个文件，API 几乎同构。
- 写操作采用"乐观更新 + 防抖全量同步"策略，适合演示与中小规模；高并发场景可细化为按行 CRUD + 增量同步。
