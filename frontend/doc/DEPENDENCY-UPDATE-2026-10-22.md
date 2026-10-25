# 依赖更新记录（2026-10-22）

## Node.js 依赖与版本基线

前端使用 Nuxt/Vue，开发、构建及生产 SSR 服务均依赖 Node.js。
生产启动入口仍为 `node .output/server/index.mjs`；API 后端为独立的 Rust/Axum 服务。

- `.nvmrc` 与 CI 使用 Node.js 24.22.1 LTS；`engines.node` 限定为 `>=24.22.1 <25`。
- pnpm 从 10.15.1 升级至 10.34.7，保留 10.x 主版本。
- Node 类型定义切换到 24.x，与运行环境一致。
- 本次验证使用从 Node.js 官方下载并通过 SHA-256 校验的 24.22.1，未修改系统默认 Node.js。

## 直接依赖

“更新前”取自原锁文件的实际解析版本。

| 包 | 更新前 | 更新后 |
| --- | --- | --- |
| Nuxt | 4.4.8 | 4.6.2 |
| Vue | 3.5.39 | 3.5.44 |
| Vue Router | 5.1.0 | 5.4.0 |
| @lucide/vue | 1.52.0 | 1.61.0 |
| markdown-it | 14.3.0 | 14.3.3 |
| KaTeX | 0.16.47 | 0.19.0 |
| @types/markdown-it | 14.1.2 | 14.2.0 |
| @types/node | 25.9.5 | 24.19.2 |
| TypeScript | 6.0.2 | 6.0.3 |
| vue-tsc | 3.3.7 | 3.3.13 |

GSAP 3.15.0 与 markdown-it-texmath 1.0.0 保持不变。
间接依赖随锁文件更新，构建工具解析为 Nitro 2.13.5、Vite 8.3.5。
KaTeX 更新跨越 0.x 次版本，以修复原版本的已知安全问题；保留 markdown-it 14.x 和 TypeScript 6.x。

## 安装信任与兼容适配

- 包来自 npm 官方 registry，具体版本及完整性摘要保存在 `pnpm-lock.yaml`。
- 开启 `verify-store-integrity`。
- 构建脚本信任名单收紧到 `@parcel/watcher@2.5.6` 与 `esbuild@0.28.2`。
  已检查前者的按需本地编译脚本及后者的安装脚本；启用 `strictDepBuilds`，新增未批准的依赖构建脚本会使安装失败。
- 使用 Nuxt 新版公开的 fetch 类型，明确 Rust API 的动态路径及 HTTP 方法；SSR 请求上下文转发行为保持不变。
- 数学插件声明改用 ESM 类型导入，匹配新版 markdown-it 类型定义。
- 移除 Vite 8 已忽略的旧 esbuild 转换配置，保留现有 JS/CSS 压缩设置。

## 安全审计与剩余限制

`pnpm audit` 的已知漏洞告警由 **62 项**（5 critical、36 high、17 moderate、4 low）
降至 **2 项 high**。两项上游间接依赖截至本次检查均没有可用修复版本，
没有通过忽略告警或强制覆盖不兼容版本隐藏问题：

| 包 | 引入路径 | 上游告警 |
| --- | --- | --- |
| node-forge 1.4.0 | Nuxt → @nuxt/nitro-server → nitropack → listhen | [RSA 签名验证问题](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| braces 3.0.3 | Nuxt → @nuxt/nitro-server → nitropack → globby → micromatch | [深度嵌套模式导致栈耗尽](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |

这些包位于构建工具的依赖链中；当前生成的 `.output/server/package.json` 未列出它们。
后续应继续检查 Nitro 及这两个包的修复发布，再重新运行审计。
审计反映检查时已公开的漏洞，不能保证依赖不存在未知问题。

## 验证

- `pnpm install --frozen-lockfile`：通过。
- 批准版本的待执行构建脚本重建：通过。
- `pnpm test`：148 项通过。
- `pnpm typecheck`：通过。
- `pnpm build`：通过，生成 Node.js SSR 服务。
- Markdown/KaTeX 冒烟检查：行内及块级公式、括号分隔符、MathML、无效公式容错与原始 HTML 转义均通过。
- 生产 SSR 冒烟检查：首页、关于、登录、论坛、游戏列表均返回 HTTP 200，检查到服务端 HTML 和安全响应头；构建后的 JS 资源可正常加载。

构建仍提示部分 JS 分块超过 500 kB；未通过提高阈值隐藏这一体积提示。

以上为本地依赖更新与验证；尚未部署到线上环境。
