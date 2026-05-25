# DevBit Tech

DevBit Tech 官方网站 — 社区论坛与开发者平台。

## 项目结构

```
devbit-tech/
├── frontend/          # Nuxt 4 前端应用（含内置 Nitro API，用于开发/演示）
├── deploy/
│   └── nginx/
│       └── devbit.conf  # Nginx 反向代理配置
devbit-tech-backend/   # Rust 后端服务（生产环境 API）
├── src/
│   ├── main.rs        # 入口、认证路由
│   ├── forum.rs       # 论坛路由与业务逻辑
│   ├── database.rs    # PostgreSQL 连接池与表初始化
│   └── lib.rs         # 模块声明
```

## 快速开始

### 前端（Nuxt 4）

```bash
cd devbit-tech/frontend
npm install
npm run dev
```

开发服务器将在 <http://localhost:3000> 启动。

### 后端（Rust）

```bash
cd devbit-tech-backend
# 配置 .env 文件（DATABASE_URL、JWT_SECRET、SMTP_* 等）
cargo run --release
```

后端服务将在 <http://127.0.0.1:7878> 启动。

## 可用脚本（前端）

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器（端口 3000） |
| `npm run build` | 构建生产版本 |
| `npm run generate` | 生成静态站点 |
| `npm run preview` | 预览生产构建 |

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
    │  含 Nitro 内置API │       │  PostgreSQL 数据库    │
    └──────────────────┘       └──────────────────────┘
```

- **开发环境**：前端使用内置 Nitro API（JSON 文件存储），无需后端
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
