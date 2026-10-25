# CampusFlow AI · 学生智能成长平台

只面向学生的个人校园工作台：课程表、考勤、成绩、绩点、学习计划与 AI 助手集中在一个界面，回答三个核心问题——**我今天要完成什么？我的学习状态怎么样？下一步怎么提高？**

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS 3 + Lucide React + Recharts
- React Router（HashRouter）
- 数据层：Mock 数据 + localStorage 持久化，service 层封装，可无缝替换真实后端

## 快速开始

```bash
npm install        # 或 pnpm install
npm run dev        # 开发服务器 → http://localhost:5173
npm run build      # 产出 dist/
npm run preview    # 本地预览构建产物
```

> 登录页提供「演示账号一键登录」，直接以演示学生 李明（ST2026001）进入。

## 项目结构

```
campusflow-ai/
├── index.html
├── vite.config.ts / tsconfig.json / tailwind.config.js / postcss.config.js
└── src/
    ├── main.tsx / App.tsx          # 入口 + 路由（HashRouter + 登录守卫）
    ├── i18n.tsx                    # 中英文词典 + LangContext
    ├── index.css                   # Tailwind + 通用样式类（card/btn/input）
    ├── types.ts                    # 数据实体类型
    ├── data/mockData.ts            # 演示数据（以"今天"为基准动态生成）
    ├── services/
    │   ├── storage.ts              # localStorage 封装
    │   ├── studentService.ts       # 学生数据 + 健康度评分 + 派生计算
    │   ├── aiService.ts            # AI Provider 抽象 + 内置规则问答 + 失败回退
    │   └── plannerService.ts       # SGPA/CGPA + 目标反推 + 报告导出
    ├── components/
    │   ├── AppShell.tsx            # 布局：桌面侧导航 / 移动端底部导航 / 顶栏
    │   └── ui.tsx                  # Card/Badge/RingProgress/Toast/空态加载态
    └── pages/
        ├── Login.tsx               # 登录页
        ├── Dashboard.tsx           # 今日驾驶舱
        ├── AIChat.tsx              # AI 助手（全屏聊天 + 历史会话）
        ├── Timetable.tsx           # 课程表（日/周视图 + 冲突解释）
        ├── Grades.tsx              # 学业表现（趋势图 + 优劣势）
        ├── Attendance.tsx          # 考勤中心（月历 + 警戒线）
        ├── CGPAPlanner.tsx         # 绩点计算 + 目标反推三方案
        ├── StudyTasks.tsx          # 任务中心 + AI 拆解
        ├── CareerExplorer.tsx      # 职业探索（雷达图 + 学习路线）
        └── Settings.tsx            # 设置（AI 接口 + 数据授权）
```

## AI 接口配置

进入「个人设置 → AI 服务与接口」可选择：

| Provider | 说明 |
| --- | --- |
| 内置问答 | 无需联网，基于本地规则回答课程/考勤/成绩/计划类问题 |
| Dify | Chat Messages 接口（`POST {baseUrl}/chat-messages`） |
| DeepSeek | Chat Completions（`POST {baseUrl}/chat/completions`） |
| OpenAI 兼容 | 同 Chat Completions 协议，可指向任意兼容网关 |

失败处理链：**远程接口请求失败 → 自动回退本地规则问答 → 明确提示用户**，页面永不白屏。

API Key 仅保存在浏览器 localStorage（演示占位）；生产环境务必改为后端代理，不要把密钥写入前端代码。

## 后续接入真实后端的建议

1. **替换 service 层即可**：`studentService.ts` 中每个函数（`getTasks`/`saveTasks`/`getTimetable`…）目前读写 localStorage，改为 fetch 真实 API（保持函数签名不变，页面零改动）。
2. **登录**：`setLogin/isLoggedIn` 换成 JWT 会话；`Login.tsx` 提交逻辑对接 `POST /auth/login`。
3. **AI 代理**：新增后端 `POST /api/ai/chat`，由服务端保存密钥并转发（Dify/DeepSeek/OpenAI 均可统一封装），前端 `aiService.remoteAnswer` 直接调用该端点。
4. **数据同步**：课程表/考勤/成绩来自教务系统时，注意按 `types.ts` 中的实体结构对齐字段。
5. **管理后台与审计**：教师端、管理员端另行开发，不放入学生端；学生端保持"只能读取自己的数据"的边界。

## 隐私与安全

- 学生可在设置中控制 AI 是否读取课程/考勤/成绩/任务数据，AI 回答会标注本次引用了哪些数据
- 前端不硬编码任何真实 API Key
- 所有 AI 生成内容均标注"仅供参考"
