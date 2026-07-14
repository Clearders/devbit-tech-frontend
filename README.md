# DevBit Tech

DevBit Tech 官方网站 — 社区论坛与开发者平台。

## 工作区结构

本 Git 仓库只包含 Nuxt 前端。后端、游戏和部署配置是当前工作区中的独立同级项目，需要分别进行版本控制与发布。

```
Devbit-website/
├── devbit-tech/             # 本仓库
│   └── frontend/            # Nuxt 4 前端
├── devbit-tech-backend/     # 独立 Rust/Axum API 仓库
├── heartstring_blade/       # 独立 Bevy/WASM 游戏仓库
└── deploy/                  # Nginx 配置（当前不在 Git 中）
```

## 快速开始

### 前端（Nuxt 4）

```bash
cd devbit-tech/frontend
pnpm install
pnpm dev
```

开发服务器将在 <http://localhost:3000> 启动。

### 后端（Rust）

```bash
cd ../devbit-tech-backend
# 配置 .env 文件（DATABASE_URL、JWT_SECRET、SMTP_* 等）
cargo run --release
```

后端服务将在 <http://127.0.0.1:7878> 启动。

## 可用脚本（前端）

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器（端口 3000） |
| `pnpm build` | 构建生产版本 |
| `pnpm typecheck` | 运行 Nuxt / TypeScript 类型检查 |
| `pnpm generate` | 生成静态站点 |
| `pnpm preview` | 预览生产构建 |

## 部署架构

```
                   ┌─────────────┐
                   │   Nginx     │
                   │  :80 / :443 │
                   └──────┬──────┘
            /              │              /api/
    ┌──────────────────┐   │   ┌──────────────────────┐
    │  Nuxt 4 Frontend │◄──┴──►│  Rust Backend (Axum) │
    │  (localhost:3000)│       │  (localhost:7878)    │
    │  /api 反向代理    │       │  PostgreSQL 数据库    │
    └──────────────────┘       └──────────────────────┘
```

- **开发环境**：Nuxt 将 HTTP `/api/**` 代理到 Rust 后端（默认 `http://127.0.0.1:7878`）；WebSocket 直接连接后端，可用 `NUXT_PUBLIC_WS_URL` 覆盖
- **生产环境**：Nginx 将 `/api/` 请求代理到 Rust 后端，其余请求代理到 Nuxt 前端

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | [Nuxt 4](https://nuxt.com/) + [Vue 3](https://vuejs.org/) |
| 前端语言 | [TypeScript](https://www.typescriptlang.org/) |
| 后端框架 | [Axum](https://github.com/tokio-rs/axum) (Rust) |
| 后端语言 | Rust (edition 2024) |
| 数据库 | PostgreSQL + [SQLx](https://github.com/launchbadge/sqlx) |
| 认证 | JWT (前端) / JWT + PBKDF2 (后端) |
| 反向代理 | Nginx |
| 邮件服务 | Lettre (SMTP) |

## 多端适配

- **响应式断点**：480px / 768px / 1024px 三档自适应
- **移动端优化**：汉堡菜单、底部抽屉弹窗、触摸目标增强（≥44px）
- **安全区域**：支持 iPhone 刘海屏 / Dynamic Island (`safe-area-inset-*`)
- **性能优化**：Canvas 粒子系统根据 DPR 自动降级、`prefers-reduced-motion` 尊重用户偏好
- **暗色模式**：全局暗色主题，支持 `color-scheme: dark`
- **横屏适配**：针对移动端横屏场景优化布局高度
