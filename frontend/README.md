# DevBit Tech Frontend

基于 [Nuxt 4](https://nuxt.com/) 构建的 DevBit Tech 社区论坛前端应用。

## 项目特点

- **Nuxt 4 + Vue 3**：使用最新的 Composition API 和 `<script setup>`，完整 Nuxt 4 目录结构
- **多端适配**：480px / 768px / 1024px 三档响应式断点，移动端汉堡菜单、底部抽屉弹窗
- **后端 API**：前端统一调用 `/api`，开发和生产都代理到 Rust 后端服务
- **TypeScript**：全链路类型安全，共享类型定义在 `shared/` 目录
- **论坛系统**：帖子浏览/发布/搜索、评论、私信、点赞、置顶/锁定管理
- **身份认证**：基于 JWT（HttpOnly Cookie），含注册、登录和验证码流程
- **Canvas 动态背景**：基于设备 DPR 自适应粒子密度，尊重 `prefers-reduced-motion`
- **SEO 优化**：`useSeoMeta` + Open Graph + 结构化 Meta 标签
- **安全区域适配**：支持 iPhone 刘海屏 / Dynamic Island (`safe-area-inset-*`)

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
│   │   └── forum/                 # 论坛页面
│   ├── plugins/auth.ts            # 认证插件
│   └── utils/                     # 工具函数
├── shared/                        # 前后端共享类型
│   ├── auth.ts
│   └── forum.ts
├── doc/API.md                     # API 接口文档
└── public/                        # 静态资源
```

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务器将在 <http://localhost:3000> 启动。

## 可用脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm typecheck` | 运行 Nuxt / TypeScript 类型检查 |
| `pnpm generate` | 生成静态站点 |
| `pnpm preview` | 预览生产构建 |

## 开发数据

数据库迁移不会创建预置账户或共享密码。请通过注册流程创建本地账户；在 debug 开发环境中可不配置 SMTP，验证码会通过 `developmentCode` 返回。

## API 模式

- **开发模式** (`pnpm dev`)：Nuxt 将 HTTP `/api/**` 代理到 Rust 后端服务；WebSocket 直接连接同一后端（默认端口 `7878`），可用 `NUXT_PUBLIC_WS_URL` 覆盖
- **生产模式**：Nginx 将 `/api/` 请求代理到 Rust 后端服务，前端仅负责页面渲染

API 详细文档请参阅 [doc/API.md](doc/API.md)。
