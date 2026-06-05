# DevBit Tech API

最后更新：2026-06-05

本项目的前端统一通过 `runtimeConfig.public.apiBase = '/api'` 调用后端 API。开发环境由 Nuxt route rules 将 `/api/**` 代理到 Rust 后端，生产环境由 Nginx 将 `/api/` 代理到同一个 Rust 服务。

---

## API 版本

| 版本 | 发布日期 | 说明 |
|---|---|---|
| **0.1.1** | 2026-06-05 | 新增好友系统、用户搜索接口；bootstrap 响应增加 `comments` 字段 |
| **0.1** | 2026-05-15 | 初始版本：认证、论坛帖子、评论、私信 |

---

## 基础 URL

- 开发环境：`http://localhost:3000/api`（代理到 `NUXT_API_PROXY_TARGET`，默认 `http://127.0.0.1:7878`）
- 生产环境：`/api`

## 身份认证

- 认证基于 JWT Token。
- 后端通过 `Set-Cookie` 写入 `auth_token` HttpOnly Cookie。
- 已认证的请求可通过 Cookie 或 `Authorization: Bearer <token>` 传递身份。
- 两种方式（Cookie 或请求头）均可接受。
- 会话有效期：24 小时。

## 开发账户

所有预置账户使用相同的密码：`Devbit123`

| 邮箱 | 用户名 | 管理员 |
|---|---|---|
| `clearders@devbit.tech` | Clearders | ✅ |
| `epsilon@devbit.tech` | EpsilonHunter | ✅ |
| `codemaster@example.com` | CodeMaster | ❌ |
| `debugqueen@example.com` | DebugQueen | ❌ |
| `pixelartist@example.com` | PixelArtist | ❌ |
| `stack@example.com` | StackOverflow | ❌ |

## 验证码

`POST /api/register/send_code` 会生成 6 位验证码；未配置 SMTP 时，开发环境响应会包含 `developmentCode` 便于本地调试。

- 有效期：10 分钟

## 错误响应

所有接口可能返回以下格式的错误：

```json
{
  "statusCode": 400,
  "statusMessage": "Human-readable error description."
}
```

常见状态码：

| 状态码 | 含义 |
|---|---|
| 400 | 请求错误 — 缺少或无效的输入 |
| 401 | 未授权 — 需要身份认证 |
| 403 | 禁止访问 — 权限不足 |
| 404 | 未找到 — 资源不存在 |

## 共享数据模型

```ts
type ForumCategory =
  | 'general'
  | 'tech'
  | 'devbit'
  | 'help'
  | 'showcase'
  | 'announcement'

interface ForumUser {
  id: number
  name: string
  avatar: string
  isAdmin: boolean
}

interface ForumPost {
  id: number
  title: string
  content: string
  author: ForumUser
  category: ForumCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  viewCount: number
  commentCount: number
  likeCount: number
  likedByMe: boolean
  isPinned: boolean
  isLocked: boolean
}

interface ForumComment {
  id: number
  postId: number
  author: ForumUser
  content: string
  createdAt: string
}

interface ForumMessage {
  id: number
  sender: ForumUser
  recipient: ForumUser
  content: string
  createdAt: string
  isRead: boolean
}
```

> **v0.1.1 新增模型：**

```ts
interface FriendInfo {
  user: ForumUser
  createdAt: string
}

interface AddFriendPayload {
  friendId: number
}
```

---

# v0.1 API（2026-05-15）

> 以下为 v0.1 版本的完整 API 文档。所有接口在 v0.1.1 中均保持兼容。

---

## 认证接口

### `POST /api/login`

使用邮箱和密码进行认证。成功后通过 `Set-Cookie` 响应头设置 `auth_token` Cookie（HttpOnly, SameSite=Lax, 有效期 24 小时）。

- **认证：** 无需
- **状态码：** 成功返回 `200`，失败返回 `400` / `401`

**请求：**

```json
{
  "email": "clearders@devbit.tech",
  "password": "Devbit123"
}
```

**`200` 响应：**

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Clearders",
    "email": "clearders@devbit.tech",
    "isAdmin": true
  }
}
```

---

### `GET /api/me`

返回当前已认证的用户信息。

- **认证：** 必需
- **状态码：** 成功返回 `200`，未登录返回 `401`

**`200` 响应：**

```json
{
  "id": 1,
  "name": "Clearders",
  "email": "clearders@devbit.tech",
  "isAdmin": true
}
```

---

### `POST /api/logout`

清除当前会话并移除 `auth_token` Cookie。

- **认证：** 可选
- **状态码：** 始终返回 `200`

**`200` 响应：**

```json
{
  "success": true
}
```

---

### `POST /api/register/send_code`

为指定邮箱生成开发环境验证码。

- **认证：** 无需
- **状态码：** 成功返回 `200`，邮箱无效返回 `400`

**请求：**

```json
{
  "email": "newuser@example.com"
}
```

**`200` 响应：**

```json
{
  "message": "Verification code generated for development.",
  "expiresInSeconds": 600,
  "developmentCode": "123456"
}
```

---

### `POST /api/register`

注册新用户账户。需要从 `send_code` 获取的有效验证码。

- **认证：** 无需
- **状态码：** 成功返回 `200`，验证失败返回 `400`

**前端提交前验证规则：**
- 密码至少 8 个字符，且必须同时包含字母和数字
- `password` 和 `confirm_password` 必须一致
- 邮箱必须唯一

**请求：**

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "Devbit123",
  "confirm_password": "Devbit123",
  "code": "123456"
}
```

**`200` 响应：**

```json
{
  "id": 7,
  "name": "New User",
  "email": "newuser@example.com"
}
```

---

## 论坛接口

### `GET /api/forum/bootstrap`

返回论坛初始数据（用户、帖子、消息），前端用于在单次请求中初始化状态。

- **认证：** 可选
- **状态码：** `200`

**行为说明：**
- `posts` — 所有帖子，排序规则：置顶优先，然后按 `createdAt` 降序排列
- `users` — 所有论坛用户（已脱敏，不含密码）
- `messages` — 已认证时：当前用户的所有私信（按时间顺序）；未认证时：空数组 `[]`

**v0.1 `200` 响应：**

```json
{
  "users": [ /* ForumUser[] */ ],
  "posts": [ /* ForumPost[]（已排序） */ ],
  "messages": [ /* ForumMessage[] */ ]
}
```

---

### `GET /api/forum/users`

返回所有可见的论坛用户（已脱敏）。

- **认证：** 无需
- **状态码：** `200`

**`200` 响应：**

```json
[
  { "id": 1, "name": "Clearders", "avatar": "CD", "isAdmin": true },
  { "id": 2, "name": "EpsilonHunter", "avatar": "EH", "isAdmin": true }
]
```

---

### `GET /api/forum/posts`

返回所有论坛帖子，已排序（置顶优先，然后最新优先）。

- **认证：** 可选
- **状态码：** `200`

**查询参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `category` | `ForumCategory` | 按分类筛选帖子。省略或设为 `'all'` 则返回全部。 |

**`200` 响应：** `ForumPost[]`

---

### `GET /api/forum/posts/search`

对帖子标题、正文内容和标签进行全文搜索。

- **认证：** 可选
- **状态码：** `200`

**查询参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `q` | `string` | 不区分大小写的搜索关键词。空查询返回 `[]`。 |

**`200` 响应：** `ForumPost[]`（已排序，置顶优先然后最新优先）

---

### `GET /api/forum/posts/:id`

按 ID 返回单个帖子。会将其 `viewCount` 加 1。

- **认证：** 可选
- **状态码：** 成功返回 `200`，未找到返回 `404`

**`200` 响应：** `ForumPost`

---

### `POST /api/forum/posts`

创建新的论坛帖子。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `400` / `401`

**请求体：**

```json
{
  "title": "My first thread",
  "content": "Thread body",
  "category": "tech",
  "tags": ["nuxt", "nitro"]
}
```

| 字段 | 类型 | 必填 | 默认值 |
|---|---|---|---|
| `title` | `string` | ✅ | — |
| `content` | `string` | ✅ | — |
| `category` | `ForumCategory` | ❌ | `"general"` |
| `tags` | `string[]` | ❌ | `[]` |

**`200` 响应：** 创建的 `ForumPost`

---

### `DELETE /api/forum/posts/:id`

删除帖子及其所有关联评论。仅帖子作者或管理员可以操作。

- **认证：** 必需
- **状态码：** 成功返回 `204`，失败返回 `401` / `403` / `404`

**响应：** 空响应体，HTTP 204 No Content

---

### `PUT /api/forum/posts/:id/pin`

切换帖子的置顶状态。

- **认证：** 必需（仅管理员）
- **状态码：** 成功返回 `200`，失败返回 `401` / `403` / `404`

**`200` 响应：** 更新后的 `ForumPost`（`isPinned` 已切换）

---

### `PUT /api/forum/posts/:id/lock`

切换帖子的锁定状态。锁定的帖子将拒绝新评论。

- **认证：** 必需（仅管理员）
- **状态码：** 成功返回 `200`，失败返回 `401` / `403` / `404`

**`200` 响应：** 更新后的 `ForumPost`（`isLocked` 已切换）

---

### `PUT /api/forum/posts/:id/like`

切换当前用户对帖子的点赞状态。若已点赞则取消，否则添加点赞。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `401` / `404`

**`200` 响应：** 更新后的 `ForumPost`（`likedByMe` 和 `likeCount` 反映变更）

---

## 评论接口

### `GET /api/forum/posts/:id/comments`

返回帖子的所有评论，按时间顺序排列（最早优先）。

- **认证：** 无需
- **状态码：** 成功返回 `200`，帖子未找到返回 `404`

**`200` 响应：** `ForumComment[]`

---

### `POST /api/forum/posts/:id/comments`

为帖子添加评论。若帖子已锁定则拒绝。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `400` / `401` / `403` / `404`

**请求：**

```json
{
  "content": "Useful thread."
}
```

**`200` 响应：** 创建的 `ForumComment`

---

### `DELETE /api/forum/comments/:id`

删除评论。仅评论作者或管理员可以操作。

- **认证：** 必需
- **状态码：** 成功返回 `204`，失败返回 `401` / `403` / `404`

**响应：** 空响应体，HTTP 204 No Content

---

## 私信接口

### `GET /api/forum/messages`

返回涉及当前用户的所有私信，按时间顺序排列（最早优先）。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `401`

**`200` 响应：** `ForumMessage[]`

---

### `POST /api/forum/messages`

向其他用户发送私信。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `400` / `401` / `404`

**请求：**

```json
{
  "recipientId": 2,
  "content": "Can you review this post?"
}
```

| 字段 | 类型 | 必填 |
|---|---|---|
| `recipientId` | `number` | ✅ |
| `content` | `string` | ✅ |

**`200` 响应：** 创建的 `ForumMessage`（`isRead: false`）

---

### `PUT /api/forum/messages/:id/read`

将单条消息标记为已读。仅消息的接收者可以标记。

- **认证：** 必需
- **状态码：** 成功返回 `204`，失败返回 `401` / `403` / `404`

**响应：** 空响应体，HTTP 204 No Content

---

### `PUT /api/forum/messages/conversation/:partnerId/read`

一次性将来自特定联系人的所有未读消息标记为已读。

- **认证：** 必需
- **状态码：** 成功返回 `204`，失败返回 `401`

**响应：** 空响应体，HTTP 204 No Content

---

## 数据持久化（v0.1）

- **数据源：** Rust 后端使用 PostgreSQL。
- 后端启动时会自动创建缺失的数据表。
- 持久化数据包括：用户、验证码、帖子、评论、消息、点赞关系。

---

# v0.1.1 更新（2026-06-05）

> v0.1.1 在 v0.1 基础上新增以下接口和变更，所有 v0.1 接口保持向后兼容。

---

## 变更：bootstrap 响应增加 `comments` 字段

`GET /api/forum/bootstrap` 的响应体现在包含 `comments` 数组，前端无需再为每个帖子单独请求评论。

- **认证：** 可选
- **状态码：** `200`

**v0.1.1 `200` 响应：**

```json
{
  "users": [ /* ForumUser[] */ ],
  "posts": [ /* ForumPost[]（已排序） */ ],
  "comments": [ /* ForumComment[] */ ],
  "messages": [ /* ForumMessage[] */ ]
}
```

---

## 新增：好友接口

### `GET /api/forum/friends`

返回当前用户的好友列表，按用户名升序排列。

- **认证：** 必需
- **状态码：** 成功返回 `200`，未登录返回 `401`

**`200` 响应：** `FriendInfo[]`

```json
[
  {
    "user": { "id": 3, "name": "CodeMaster", "avatar": "CM", "isAdmin": false },
    "createdAt": "2026-06-01T12:00:00+00:00"
  }
]
```

---

### `POST /api/forum/friends`

添加好友。

- **认证：** 必需
- **状态码：** 成功返回 `200`，失败返回 `400` / `401` / `404`

**请求：**

```json
{
  "friendId": 3
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `friendId` | `number` | ✅ | 要添加为好友的用户 ID，不能是当前用户自己 |

**`200` 响应：** 创建的 `FriendInfo`

> 重复添加同一好友是幂等的（`ON CONFLICT DO UPDATE`），不会报错，仅更新 `createdAt` 时间戳。

---

### `DELETE /api/forum/friends/:friendId`

删除好友。

- **认证：** 必需
- **状态码：** 成功返回 `204`，失败返回 `401` / `404`

**响应：** 空响应体，HTTP 204 No Content

---

## 新增：用户搜索接口

### `GET /api/forum/users/search`

按用户名搜索用户（模糊匹配），最多返回 20 条结果。

- **认证：** 必需
- **状态码：** 成功返回 `200`，未登录返回 `401`

**查询参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `q` | `string` | 不区分大小写的搜索关键词。空查询返回 `[]`。 |

**`200` 响应：** `ForumUser[]`（按用户名升序，最多 20 条）

```json
[
  { "id": 3, "name": "CodeMaster", "avatar": "CM", "isAdmin": false }
]
```

---

## 数据持久化（v0.1.1 新增）

- 新增数据表：`friends`（字段：`user_id`, `friend_id`, `created_at`；联合唯一约束 `(user_id, friend_id)`）
- 后端启动时自动创建该表（如不存在）。
