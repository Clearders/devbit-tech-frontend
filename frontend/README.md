# DevBit Tech Frontend

基于 [Nuxt 3](https://nuxt.com/) 构建的 DevBit Tech 社区论坛前端应用。

## 项目特点

- **Nuxt 3 + Vue 3**：使用最新的 Composition API 和 `<script setup>`
- **后端 API**：前端统一调用 `/api`，开发和生产都代理到 Rust 后端服务
- **TypeScript**：全链路类型安全，共享类型定义在 `shared/` 目录
- **论坛系统**：帖子浏览/发布/搜索、评论、私信、点赞、置顶/锁定管理
- **身份认证**：基于 Session Token（Cookie + Bearer Header），含注册/登录/验证码流程

## 项目结构

```
frontend/
├── app/
│   ├── app.vue                    # 根组件
│   ├── assets/css/                # 全局样式
│   ├── components/                # Vue 组件
│   │   ├── AppFooter.vue
│   │   ├── AppNavbar.vue
│   │   ├── DynamicBackground.vue
│   │   ├── Forum*.vue             # 论坛相关组件
│   ├── composables/               # 组合式函数（状态管理）
│   │   ├── useAuth.ts             # 认证状态 & API
│   │   ├── useForum.ts            # 论坛状态 & 业务逻辑
│   │   └── useForumApi.ts         # 论坛 API 封装
│   ├── layouts/default.vue        # 默认布局
│   ├── middleware/                 # 路由守卫
│   │   ├── auth.ts                # 需要登录
│   │   └── guest.ts               # 仅未登录
│   ├── pages/                     # 页面路由
│   │   ├── index.vue              # 首页
│   │   ├── about.vue              # 关于
│   │   ├── games.vue              # 游戏
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
npm install
npm run dev
```

开发服务器将在 <http://localhost:3000> 启动。

## 可用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run generate` | 生成静态站点 |
| `npm run preview` | 预览生产构建 |

## 开发账户

所有预置账户使用相同密码：`Devbit123`

| 邮箱 | 用户名 | 管理员 |
|---|---|---|
| `clearders@devbit.tech` | Clearders | ✅ |
| `epsilon@devbit.tech` | EpsilonHunter | ✅ |
| `codemaster@example.com` | CodeMaster | ❌ |
| `debugqueen@example.com` | DebugQueen | ❌ |
| `pixelartist@example.com` | PixelArtist | ❌ |
| `stack@example.com` | StackOverflow | ❌ |

## API 模式

- **开发模式** (`npm run dev`)：Nuxt 将 `/api/**` 代理到 Rust 后端服务（默认 `http://127.0.0.1:7878`）
- **生产模式**：Nginx 将 `/api/` 请求代理到 Rust 后端服务，前端仅负责页面渲染

API 详细文档请参阅 [doc/API.md](doc/API.md)。
