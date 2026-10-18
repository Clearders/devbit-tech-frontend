# 前端体验改进交付与验证记录

日期：2026-10-17。状态：前端本地实现完成，后端新增能力待适配，未部署。

本文保留 10 月 17 日的交付记录。10 月 18 日好友与私信已升级为独立页面，当前共 148 项测试通过；最新社交交付、布局及转场验证以 [SOCIAL-WORKSPACE-IMPLEMENTATION.md](SOCIAL-WORKSPACE-IMPLEMENTATION.md) 为准。

## 已完成

| 范围 | 最终行为 |
|---|---|
| 视觉 | 保留暖白、蓝色及胶囊导航；独立操作蓝、加强辅助文字、统一新增控件圆角和焦点，论坛摘要/元信息提高字号 |
| 首页 | 学习与创作定位、论坛/实验入口、最近三条讨论；真实接口加载失败独立提示并可重试 |
| 账号 | 中文登录注册、密码显示、字段关联错误与首错聚焦、保留真实 HTTP 错误；会话检查失败后登录入口仍可用 |
| 账号恢复 | disabled/v2/mock 三种状态；邮箱、验证码、新密码、倒计时与结果界面；默认显示暂未开放 |
| 阅读 | Markdown token 摘要、公式占位、中文相对日期及北京时间；SSR 共享时间戳，客户端共用分钟计时器 |
| 论坛 | 手机两行标题、短搜索提示、分类溢出渐隐、无结果/空分类分别说明和清除筛选 |
| 社交 | legacy/v2/mock 统一服务、类型及能力开关；找人、申请收发处理、移除、屏蔽、偏好、在线快照及实时事件预留 |
| 状态保护 | 搜索防抖/IME/乱序保护、独立用户操作锁、账号迟到响应丢弃、申请列表乱序保护、冲突后刷新、弹层内错误反馈 |
| 私信 | 来源返回、好友未读数、分对象草稿、成功后清空/失败保留、可见会话才已读、中文组词回车不误发送 |
| 手机私信 | 近全屏面板、背景滚动限制、隐藏停靠拖拽缩放、焦点边界及 visualViewport 输入区适配 |
| 实验 | 真实封面裁切避开 HUD、返回按钮左下角、真实加载阶段/长等待/缺失画布错误、画布复用与重进时序修复 |
| 接入资料 | [V2 HTTP/事件契约及逐项适配清单](SOCIAL-API-V2.md)、`.env.example` 和 README 预览说明 |

默认模式仍是 `legacy`，旧单向关系标为联系人，不宣称双方同意。真实接口错误不会回退 Mock 或旧写接口。Mock 按账号隔离，演示社交和消息只在内存运行；其他真实写请求统一拒绝。

## 自动检查

使用已安装依赖和本机 Codex Node 运行项目脚本对应命令：

| 检查 | 结果 |
|---|---|
| `node --test tests/*.test.mjs`（等同 `pnpm test`） | **133/133 通过**，含原有 108 项及新增 25 项 |
| `nuxt typecheck`（等同 `pnpm typecheck`） | 通过，退出码 0 |
| `nuxt build`（等同 `pnpm build`） | 通过，生成 `.output/server/index.mjs` |
| 以社交 Mock 执行生产构建 | 按预期拒绝：`Mock mode is development-only` |
| `git diff --check` | 无补丁空白错误；Windows Git 有换行规范提示 |

新增测试覆盖 HTTP 错误保留、已知字段错误、恢复模式/验证码/间隔、SSR 时间与计时器清理、日期边界、Markdown 摘要、近期讨论排序、社交适配与权限开关、申请处理/撤回/重复提交/移除/屏蔽、账号隔离、搜索/申请乱序与操作锁、画布等待和生命周期。

实验回归测试直接执行组件逻辑，包含「布局标记尚未添加时重进」「初始化中离开后画布迟到」「初始化失败不报告运行」。构建存在 Nuxt 插件 sourcemap 与包体提示，未阻断构建。

原始日志位于 `D:/Devbit-website/output/implementation-2026-10-17/tests.log` 和 `production-build.log`。

## 浏览器验证

使用 Codex 内置浏览器验证本地应用，响应式尺寸包括 1440×900、1024×768、390×844、320×720，另检查了 768×1024。关键视图未见横向溢出，320px 社交面板在可见区域内。

| 场景 | 结果 |
|---|---|
| Mock 接受申请 | 好友 1 → 2，待处理申请清空 |
| Mock 拒绝申请 | 申请清空，未建立好友 |
| 搜索/发送/撤回申请 | 显示等待验证；撤回后恢复添加；清空输入恢复初始提示 |
| 键盘标签及确认弹层 | End 切换到偏好；Escape 取消移除，焦点回到原按钮 |
| 移除好友 | 确认后从列表消失，原会话与未读仍保留 |
| 屏蔽/解除屏蔽 | 从好友列表隐藏，屏蔽列表可管理，解除后重新获取关系 |
| 偏好保存 | 保存后显示实际返回值及完成提示 |
| 草稿与私信 | 两位聊天对象独立草稿，返回恢复；发送成功显示消息并清空对应内容 |
| 会话历史 | 可取消；Mock 确认后仅本实例对应会话不再显示 |
| 注册/登录 | 空表单中文错误，聚焦首错，密码显示保留输入，手机无横向溢出 |
| 恢复演示 | Mock 生成 123456 并按 60 秒倒计时；确认逻辑通过自动测试 |
| 论坛 | 无搜索结果和空分类提示不同，清除筛选可恢复列表 |
| 实验 | 运行画布、Space 泛光切换、连续重进三次仅一个画布、离开隐藏及缩放有效；左上参数无遮挡 |
| 默认生产包 | `/`、`/login`、`/forgot-password` 返回 200；`/dev-preview` 返回 404；封面静态资源 200 |
| 后端未运行 | 首页讨论显示错误及重试，其他首屏可浏览；导航仍可进入登录；恢复显示暂未开放 |

原始截图均保留在 `D:/Devbit-website/output/implementation-2026-10-17/`。

## 截图对照

实施前截图来自 2026-10-08 的线上审查；实施后为本地前端，部分明确标注 Mock。内容、账号及视口可能不同，不能用来推断线上数据或后端行为已改变。

| 视图 | 实施前 | 实施后 |
|---|---|---|
| 首页桌面 | `output/devbit-online-review-2026-10-08/01-home-desktop.png` | `output/implementation-2026-10-17/home-desktop.jpg` |
| 首页手机 | `output/devbit-online-review-2026-10-08/15-home-mobile.png` | `output/implementation-2026-10-17/home-mobile.jpg` |
| 注册手机 | `output/devbit-online-review-2026-10-08/13-register-mobile.png` | `output/implementation-2026-10-17/register-validation-mobile.jpg` |
| 实验列表 | `output/devbit-online-review-2026-10-08/06-games-desktop.png` | `output/implementation-2026-10-17/experiments-desktop.jpg` |
| 实验运行 | `output/devbit-online-review-2026-10-08/07-game-runtime.png` | `output/implementation-2026-10-17/experiment-running-before-space.jpg` |
| 空分类手机 | `output/devbit-online-review-2026-10-08/19-category-empty-mobile.png` | `output/implementation-2026-10-17/forum-empty-category-mobile.jpg` |

以上路径相对 `D:/Devbit-website/`。新增社交截图：`friends-desktop.jpg`、`friends-mobile.jpg`、`friend-request-desktop.jpg`、`chat-mobile.jpg`。恢复截图：`recovery-mock-mobile.jpg`、`recovery-disabled-production.jpg`。

## 待后端/设备联调

- 新端点、双向关系持久化、旧联系人迁移、真实邮件送达、屏蔽/偏好在实际发送端点的权限执行、在线来源及 WebSocket 推送仍为**待适配**。具体清单见 [契约](SOCIAL-API-V2.md)。
- 没有使用真实账号做两端互发、跨设备并发、邮件恢复或生产数据写入；Mock 验证不替代这些验收。
- 手机检查使用浏览器视口模拟；真实 iOS/Android 软键盘、设备旋转与安全区域仍需设备验证。
- 画布加载/错误生命周期有逻辑测试和本地实际运行验证；实际 GPU 重置/驱动上下文丢失仍需设备验证。
- 实验包仍尝试请求缺失的 Bevy 品牌资源，属现有 WASM 包资源问题；当前核心图形与键盘功能可运行，本轮未修改 WASM/Rust。

本地可交互演示：`http://127.0.0.1:3000/dev-preview`。刷新重置数据；本轮未改动 Rust 后端、数据库或线上数据，也未提交部署。
