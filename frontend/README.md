# DevBit Tech Frontend

基于 [Nuxt 4](https://nuxt.com/) 构建的 DevBit Tech 社区论坛前端应用。

## 项目特点

- **Nuxt 4 + Vue 3**：使用最新的 Composition API 和 `<script setup>`，完整 Nuxt 4 目录结构
- **多端适配**：480px / 768px / 1024px 三档响应式断点，移动端汉堡菜单、底部抽屉弹窗
- **后端 API**：前端统一调用 `/api`，开发和生产都代理到 Rust 后端服务
- **TypeScript**：全链路类型安全，共享类型定义在 `shared/` 目录
- **论坛系统**：帖子浏览/发布/搜索、评论、私信、点赞、置顶/锁定管理
- **好友与私信**：独立好友中心和私信工作台，共享按账号隔离的社交状态，支持 legacy / v2 / 开发 Mock 适配
- **身份认证**：基于 JWT（HttpOnly Cookie），含注册、登录和验证码流程
- **Canvas 动态背景**：基于设备 DPR 自适应粒子密度，尊重 `prefers-reduced-motion`
- **启动与页面转场**：启动进度由客户端初始化（25%）、插件及会话检查完成（65%）、首屏挂载与水合完成（100%）推进，等待期间不自动增长；就绪后幕布上揭，普通页面使用淡入淡出和标题、正文、卡片分层显现。进出全屏游戏直接切换，减少动态效果偏好下关闭动画。
- **SEO 优化**：`useSeoMeta` + Open Graph + 结构化 Meta 标签
- **安全区域适配**：支持 iPhone 刘海屏 / Dynamic Island (`safe-area-inset-*`)

## 生产运行

生产环境使用 `pnpm build` 和 `node .output/server/index.mjs` 运行 SSR 服务。
页面依赖会话 Cookie 与运行时配置，不在构建时爬取预渲染。
通过 Nginx 部署时代理 `/api/ws`；直接启动本地生产预览时，可设置
`NUXT_PUBLIC_WS_URL=ws://127.0.0.1:7878/api/ws` 连接本地后端。

## 项目结构

```
frontend/
├── app/
│   ├── app.vue                    # 根组件
│   ├── app.config.ts              # Nuxt 4 应用运行时配置
│   ├── error.vue                  # 全局错误页面
│   ├── assets/css/                # 全局样式（移动优先响应式）
│   ├── components/                # Vue 组件
│   │   ├── AppFooter.vue
│   │   ├── AppNavbar.vue          # 响应式导航栏（含汉堡菜单）
│   │   ├── DynamicBackground.vue  # Canvas 粒子背景（性能自适应）
│   │   ├── Forum*.vue             # 论坛相关组件
│   ├── composables/               # 组合式函数（状态管理）
│   │   ├── useAuth.ts             # 认证状态 & API
│   │   ├── useBreakpoint.ts       # 响应式断点检测
│   │   ├── useForum.ts            # 论坛状态 & 业务逻辑
│   │   └── useForumApi.ts         # 论坛 API 封装
│   ├── layouts/default.vue        # 默认布局
│   ├── middleware/                 # 路由守卫
│   │   ├── auth.ts                # 需要登录
│   │   └── guest.ts               # 仅未登录
│   ├── pages/                     # 页面路由
│   │   ├── index.vue              # 首页
│   │   ├── about.vue              # 关于
│   │   ├── games/                 # 游戏页面
│   │   ├── leaderboard.vue        # 排行榜
│   │   ├── login.vue              # 登录
│   │   ├── register.vue           # 注册
│   │   ├── forgot-password.vue    # 账号恢复（按能力开启）
│   │   ├── friends.vue            # 好友中心
│   │   ├── messages/[[userId]].vue # 私信列表与单聊共用页面
│   │   └── forum/                 # 论坛页面
│   ├── plugins/auth.ts            # 认证插件
│   └── utils/                     # 工具函数
├── shared/                        # 前后端共享类型
│   ├── auth.ts
│   ├── forum.ts
│   └── social.ts
├── doc/API.md                     # API 接口文档
└── public/                        # 静态资源
```

## 快速开始

使用 Node.js **24.22.1 LTS**（版本固定在 `.nvmrc`）和 **pnpm 10.34.7**
（版本固定在 `package.json`）。开发、构建和生产 SSR 服务均需要 Node.js；
Rust/Axum API 服务独立运行。若使用 nvm，请先运行 `nvm install 24.22.1` 和 `nvm use 24.22.1`。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器将在 <http://localhost:3000> 启动。

### 依赖更新与信任

提交 `package.json` 与 `pnpm-lock.yaml` 的配套更新。依赖存储完整性校验保持开启；
依赖包的安装构建脚本仅允许执行 `pnpm-workspace.yaml` 中明确批准的包及版本。
遇到新的构建脚本请求时，先检查包的来源和脚本内容，再按需更新信任名单。

更新后运行 `pnpm audit`、`pnpm test`、`pnpm typecheck` 和 `pnpm build`。
最近一次更新与尚未修复的上游告警见 [依赖更新记录](doc/DEPENDENCY-UPDATE-2026-10-22.md)。

## 可用脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm typecheck` | 运行 Nuxt / TypeScript 类型检查 |
| `pnpm test` | 运行前端业务与交互回归测试 |
| `pnpm generate` | 生成静态站点 |
| `pnpm preview` | 预览生产构建 |

## 开发数据

### 体验改进与后端适配

实现范围见 [前端体验计划](doc/FRONTEND-IMPROVEMENT-PLAN.md)，新接口、类型和启用步骤见 [社交与账号恢复 V2 契约](doc/SOCIAL-API-V2.md)。默认 `legacy` 保留现有联系人功能，新好友申请及扩展能力等待后端适配后开启。

本地隔离预览（PowerShell）：

```powershell
$env:NUXT_PUBLIC_SOCIAL_MODE='mock'
$env:NUXT_PUBLIC_ACCOUNT_RECOVERY_MODE='mock'
pnpm dev
```

打开 `http://localhost:3000/dev-preview` 查看好友、申请与私信；刷新重置演示数据。Mock 不调用真实写接口，生产构建禁止使用；构建前移除这两个环境变量或恢复默认值。账号恢复 Mock 不修改真实密码。

```powershell
Remove-Item Env:NUXT_PUBLIC_SOCIAL_MODE -ErrorAction SilentlyContinue
Remove-Item Env:NUXT_PUBLIC_ACCOUNT_RECOVERY_MODE -ErrorAction SilentlyContinue
pnpm test
pnpm typecheck
pnpm build
```

数据库迁移不会创建预置账户或共享密码。请通过注册流程创建本地账户；在 debug 开发环境中可不配置 SMTP，验证码会通过 `developmentCode` 返回。

## API 模式

- **开发模式** (`pnpm dev`)：Nuxt 将 HTTP `/api/**` 代理到 Rust 后端服务；WebSocket 直接连接同一后端（默认端口 `7878`），可用 `NUXT_PUBLIC_WS_URL` 覆盖
- **生产模式**：Nginx 将 `/api/` 请求代理到 Rust 后端服务，前端仅负责页面渲染

API 详细文档请参阅 [doc/API.md](doc/API.md)。

## 好友中心与私信工作台

- `/friends`：好友、在线、星标、申请、成员搜索、分组、隐私与屏蔽；资料栏支持私人备注、分组和申请留言。
- `/messages`、`/messages/:userId`：会话搜索与整理、分页历史、发送失败重试、按会话保留草稿、文字/表情/图片/文件。
- 原私信浮窗和帖子作者的私信入口统一进入独立页面。好友筛选与列表滚动在返回时恢复。
- 从其他页面进入私信时使用全站过渡动画；私信内部复用固定页面实例，切换会话时保留搜索、筛选和草稿，不重播整页动画。
- 本地设置 `NUXT_PUBLIC_SOCIAL_MODE=mock` 后，可直接访问这些页面或 `/dev-preview`。预览账号完全虚构，状态仅保存在内存，刷新重置，不写入真实后端。
- 默认生产仍为 legacy 单向联系人；扩展能力默认关闭。后端交接契约见 [SOCIAL-API-V2.md](doc/SOCIAL-API-V2.md#好友中心与私信工作台扩展契约)。
- 额外设置 `NUXT_PUBLIC_SOCIAL_DEMO_SCENARIO=large` 可验证 57 位好友、分页、长昵称和搜索尚未加载的成员。
- 已完成的功能和验证范围见 [SOCIAL-WORKSPACE-IMPLEMENTATION.md](doc/SOCIAL-WORKSPACE-IMPLEMENTATION.md)。
