# DevBit Tech 前端 API 接口文档

> 版本：1.0  
> 最后更新：2026-05-03  
> 适用范围：DevBit Tech 前端项目 (`frontend/`)

---

## 目录

- [1. 概述](#1-概述)
- [2. 认证接口](#2-认证接口)
- [3. 论坛帖子接口](#3-论坛帖子接口)
- [4. 论坛评论接口](#4-论坛评论接口)
- [5. 论坛私信接口](#5-论坛私信接口)
- [6. 数据模型](#6-数据模型)
- [7. 错误处理](#7-错误处理)
- [8. 前端调用方式](#8-前端调用方式)

---

## 1. 概述

### 1.1 Base URL

| 环境 | Base URL | 配置位置 |
|------|----------|---------|
| 开发 | `http://127.0.0.1:7878/api` | `nuxt.config.ts` → `runtimeConfig.public.apiBase` |
| 生产 | `/api`（通过反向代理） | 同上 |

### 1.2 通用约定

- **请求格式**：`Content-Type: application/json`
- **响应格式**：`Accept: application/json`
- **超时时间**：10 秒
- **认证方式**：JWT Token，存储在 Cookie (`auth_token`) 中，后端通过 Authorization Header 验证
- **字符编码**：UTF-8

### 1.3 接口总览

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 认证 | `POST` | `/api/login` | 用户登录 |
| 认证 | `POST` | `/api/register` | 用户注册 |
| 认证 | `POST` | `/api/register/send_code` | 发送验证码 |
| 帖子 | `GET` | `/api/forum/posts` | 获取帖子列表 |
| 帖子 | `GET` | `/api/forum/posts/search` | 搜索帖子 |
| 帖子 | `GET` | `/api/forum/posts/{id}` | 获取帖子详情 |
| 帖子 | `POST` | `/api/forum/posts` | 创建帖子 |
| 帖子 | `DELETE` | `/api/forum/posts/{id}` | 删除帖子 |
| 帖子 | `PUT` | `/api/forum/posts/{id}/pin` | 切换置顶 |
| 帖子 | `PUT` | `/api/forum/posts/{id}/lock` | 切换锁定 |
| 评论 | `GET` | `/api/forum/posts/{id}/comments` | 获取评论列表 |
| 评论 | `POST` | `/api/forum/posts/{id}/comments` | 创建评论 |
| 评论 | `DELETE` | `/api/forum/comments/{id}` | 删除评论 |
| 私信 | `GET` | `/api/forum/messages` | 获取私信列表 |
| 私信 | `POST` | `/api/forum/messages` | 发送私信 |
| 私信 | `PUT` | `/api/forum/messages/{id}/read` | 标记单条已读 |
| 私信 | `PUT` | `/api/forum/messages/conversation/{partner_id}/read` | 标记会话已读 |

---

## 2. 认证接口

### 2.1 用户登录

```http
POST /api/login
```

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | `string` | ✅ | 用户邮箱 |
| `password` | `string` | ✅ | 用户密码 |

```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success Response** — `200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | `string` | JWT Token，有效期 24 小时 |
| `user.id` | `number` | 用户 ID |
| `user.name` | `string` | 用户名 |
| `user.email` | `string` | 用户邮箱 |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Clearders",
    "email": "clearders@example.com"
  }
}
```

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `401` | 邮箱或密码错误 |

---

### 2.2 用户注册

```http
POST /api/register
```

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 用户名 |
| `email` | `string` | ✅ | 邮箱地址 |
| `password` | `string` | ✅ | 密码 |
| `confirm_password` | `string` | ✅ | 确认密码 |
| `code` | `string` | ✅ | 邮箱验证码 |

```json
{
  "name": "NewUser",
  "email": "newuser@example.com",
  "password": "pass1234",
  "confirm_password": "pass1234",
  "code": "123456"
}
```

**Success Response** — `200 OK`

```json
{
  "name": "NewUser",
  "email": "newuser@example.com",
  "id": 7
}
```

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `400` | 参数校验失败 或 验证码错误（返回 `id: 0`） |

---

### 2.3 发送验证码

```http
POST /api/register/send_code
```

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | `string` | ✅ | 接收验证码的邮箱 |

```json
{
  "email": "newuser@example.com"
}
```

**Success Response** — `200 OK`

无返回体（HTTP 200 表示发送成功）。

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `400` | 邮件发送失败 |

> **注意**：验证码为 6 位数字，有效期 5 分钟，由 QQ 邮箱 SMTP 服务发送。

---

## 3. 论坛帖子接口

### 3.1 获取帖子列表

```http
GET /api/forum/posts
```

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | `string` | ❌ | 分类筛选。可选值见 [ForumCategory](#forumcategory) |

**Success Response** — `200 OK`

返回 `ForumPost[]` 数组，按置顶优先、时间倒序排列。

```json
[
  {
    "id": 1,
    "title": "欢迎来到 DevBit Tech 论坛！🎉",
    "content": "大家好！...",
    "author": {
      "id": 1,
      "name": "Clearders",
      "avatar": "👤",
      "is_admin": true
    },
    "category": "announcement",
    "tags": ["公告", "社区"],
    "created_at": "2026-04-26T00:00:00+00:00",
    "updated_at": "2026-04-26T00:00:00+00:00",
    "view_count": 1024,
    "comment_count": 3,
    "is_pinned": true,
    "is_locked": false
  }
]
```

**调用示例**

```
GET /api/forum/posts?category=tech
```

---

### 3.2 获取帖子详情

```http
GET /api/forum/posts/{id}
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Success Response** — `200 OK`

返回单个 `ForumPost` 对象（访问会自动增加 `view_count`）。

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `404` | 帖子不存在 |

---

### 3.3 搜索帖子

```http
GET /api/forum/posts/search
```

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | `string` | ✅ | 搜索关键词（匹配标题和内容，不区分大小写） |

**Success Response** — `200 OK`

返回 `ForumPost[]` 数组。空查询返回空数组。

**调用示例**

```
GET /api/forum/posts/search?q=Rust
```

---

### 3.4 创建帖子

```http
POST /api/forum/posts
```

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | ✅ | 帖子标题 |
| `content` | `string` | ✅ | 帖子内容（支持 Markdown） |
| `category` | `string` | ❌ | 分类，默认 `"general"` |
| `tags` | `string[]` | ❌ | 标签数组，默认 `[]` |

```json
{
  "title": "我的第一篇帖子",
  "content": "Hello World!",
  "category": "tech",
  "tags": ["Rust", "入门"]
}
```

**Success Response** — `200 OK`

返回新创建的 `ForumPost` 对象。

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `401` | 未登录 |
| `500` | 服务器错误 |

---

### 3.5 删除帖子

```http
DELETE /api/forum/posts/{id}
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Success Response** — `204 No Content`

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `404` | 帖子不存在 |

---

### 3.6 切换置顶

```http
PUT /api/forum/posts/{id}/pin
```

切换帖子的置顶状态（置顶 ↔ 取消置顶）。

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Success Response** — `200 OK`

返回更新后的 `ForumPost` 对象。

---

### 3.7 切换锁定

```http
PUT /api/forum/posts/{id}/lock
```

切换帖子的锁定状态（锁定 ↔ 解锁）。锁定后无法添加评论。

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Success Response** — `200 OK`

返回更新后的 `ForumPost` 对象。

---

## 4. 论坛评论接口

### 4.1 获取评论列表

```http
GET /api/forum/posts/{id}/comments
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Success Response** — `200 OK`

返回 `ForumComment[]` 数组，按时间正序排列。

```json
[
  {
    "id": 1,
    "post_id": 1,
    "author": {
      "id": 2,
      "name": "EpsilonHunter",
      "avatar": "👤",
      "is_admin": true
    },
    "content": "期待已久！",
    "created_at": "2026-04-27T00:00:00+00:00"
  }
]
```

---

### 4.2 创建评论

```http
POST /api/forum/posts/{id}/comments
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 帖子 ID |

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | `string` | ✅ | 评论内容 |

```json
{
  "content": "写得太好了！"
}
```

**Success Response** — `200 OK`

返回新创建的 `ForumComment` 对象。

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `403` | 帖子已锁定，禁止评论 |
| `404` | 帖子不存在 |

---

### 4.3 删除评论

```http
DELETE /api/forum/comments/{id}
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 评论 ID |

**Success Response** — `204 No Content`

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `404` | 评论不存在 |

---

## 5. 论坛私信接口

### 5.1 获取私信列表

```http
GET /api/forum/messages
```

获取当前用户的所有私信（发出的 + 收到的）。

**Success Response** — `200 OK`

返回 `ForumMessage[]` 数组，按时间倒序排列。

```json
[
  {
    "id": 1,
    "sender": {
      "id": 1,
      "name": "Clearders",
      "avatar": "👤",
      "is_admin": true
    },
    "recipient": {
      "id": 2,
      "name": "EpsilonHunter",
      "avatar": "👤",
      "is_admin": true
    },
    "content": "你好！欢迎来到社区",
    "created_at": "2026-04-28T00:00:00+00:00",
    "is_read": true
  }
]
```

---

### 5.2 发送私信

```http
POST /api/forum/messages
```

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recipient_id` | `number` | ✅ | 接收者用户 ID |
| `content` | `string` | ✅ | 消息内容 |

```json
{
  "recipient_id": 2,
  "content": "你好，有个问题想请教…"
}
```

**Success Response** — `200 OK`

返回新创建的 `ForumMessage` 对象（`is_read` 为 `false`）。

**Error Responses**

| 状态码 | 说明 |
|--------|------|
| `401` | 接收者不存在 |

---

### 5.3 标记单条消息已读

```http
PUT /api/forum/messages/{id}/read
```

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `number` | ✅ | 消息 ID |

**Success Response** — `204 No Content`

---

### 5.4 标记会话已读

```http
PUT /api/forum/messages/conversation/{partner_id}/read
```

将当前用户与 `partner_id` 之间的所有未读消息标记为已读。

**Path Parameters**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `partner_id` | `number` | ✅ | 对话对方的用户 ID |

**Success Response** — `204 No Content`

---

## 6. 数据模型

### 6.1 前端 TypeScript 类型

#### ForumUser

```ts
interface ForumUser {
  id: number
  name: string
  avatar: string
  isAdmin: boolean
}
```

#### ForumPost

```ts
interface ForumPost {
  id: number
  title: string
  content: string
  author: ForumUser
  category: ForumCategory
  tags: string[]
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
  viewCount: number
  commentCount: number
  isPinned: boolean
  isLocked: boolean
}
```

#### ForumComment

```ts
interface ForumComment {
  id: number
  postId: number
  author: ForumUser
  content: string
  createdAt: string        // ISO 8601
}
```

#### ForumMessage

```ts
interface ForumMessage {
  id: number
  sender: ForumUser
  recipient: ForumUser
  content: string
  createdAt: string        // ISO 8601
  isRead: boolean
}
```

#### ForumCategory

```ts
type ForumCategory =
  | 'general'       // 综合讨论
  | 'tech'          // 技术探讨
  | 'devbit'        // DevBit 专区
  | 'help'          // 求助问答
  | 'showcase'      // 作品展示
  | 'announcement'  // 公告通知
```

### 6.2 后端 JSON 字段映射

| 前端字段 (camelCase) | 后端字段 (snake_case) |
|---------------------|----------------------|
| `postId` | `post_id` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `viewCount` | `view_count` |
| `commentCount` | `comment_count` |
| `isPinned` | `is_pinned` |
| `isLocked` | `is_locked` |
| `isAdmin` | `is_admin` |
| `isRead` | `is_read` |

> 字段映射由 `useForumApi.ts` 中的 `mapPost()`、`mapComment()`、`mapMessage()` 函数处理。

### 6.3 认证相关类型

#### User

```ts
interface User {
  id: number
  name: string
  email: string
}
```

#### RegisterPayload

```ts
interface RegisterPayload {
  name: string
  email: string
  password: string
  code: string
  confirm_password: string
}
```

---

## 7. 错误处理

### 7.1 错误响应格式

后端错误响应为标准 HTTP 状态码：

| 状态码 | 含义 | 常见场景 |
|--------|------|---------|
| `200` | 成功 | — |
| `204` | 成功（无返回体） | 删除操作 |
| `400` | 请求参数错误 | 校验失败、验证码错误 |
| `401` | 未授权 | 登录失败、Token 过期 |
| `403` | 禁止访问 | 帖子已锁定 |
| `404` | 资源不存在 | 帖子/评论未找到 |
| `500` | 服务器内部错误 | 数据库异常 |

### 7.2 前端错误提取

前端使用 `extractApiErrorMessage()` 工具函数统一提取错误信息：

```ts
// utils/extractApiErrorMessage.ts
export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as {
    data?: { message?: string; error?: string }
    statusMessage?: string
    message?: string
  }
  return e?.data?.message ?? e?.data?.error ?? e?.statusMessage ?? e?.message ?? fallback
}
```

**优先级**：`data.message` → `data.error` → `statusMessage` → `message` → `fallback`

### 7.3 离线回退机制

当后端不可达时（`apiReachable === false`），前端自动切换至本地 Mock 数据：

- 帖子/评论/私信使用 `useForum.ts` 内置的示例数据
- 新建帖子/评论在本地状态中添加
- 搜索回退为本地字符串过滤

由 `useForum()` 中的 `apiReachable` ref 控制。

---

## 8. 前端调用方式

### 8.1 API Client 配置

所有 API 调用通过 Nuxt 的 `$fetch` 创建，配置位于：

| 文件 | 用途 | Base URL |
|------|------|----------|
| `composables/useAuth.ts` | 认证接口 | `runtimeConfig.public.apiBase` (`/api`) |
| `composables/useForumApi.ts` | 论坛接口 | `runtimeConfig.public.apiBase` (`/api`) |

```ts
// useAuth.ts
const authApi = $fetch.create({
  baseURL: config.public.apiBase as string,
  headers: {
    accept: 'application/json',
    'content-type': 'application/json'
  },
  timeout: 10000,
  retry: 0
})

// useForumApi.ts
const forumApi = $fetch.create({
  baseURL: config.public.apiBase as string,
  headers: {
    accept: 'application/json',
    'content-type': 'application/json'
  },
  timeout: 10000
})
```

### 8.2 Composables 调用关系

```
页面组件 (pages/*.vue)
    │
    ├── useAuth()          →  authApi  →  /api/login, /api/register, /api/register/send_code
    │
    └── useForum()         →  useForumApi()  →  forumApi  →  /api/forum/*
        ├── initFromApi()        加载初始数据
        ├── createPost()         创建帖子
        ├── addComment()         添加评论
        ├── deletePost()         删除帖子
        ├── deleteComment()      删除评论
        ├── togglePinPost()      切换置顶
        ├── toggleLockPost()     切换锁定
        ├── sendMessage()        发送私信
        ├── markAsRead()         标记已读
        ├── markConversationAsRead()  标记会话已读
        ├── searchPosts()        搜索帖子（API 优先）
        ├── localSearchPosts()   本地搜索（计算属性用）
        └── loadCommentsForPost() 按需加载评论
```

### 8.3 认证流程

```
┌─────────┐     POST /api/register/send_code     ┌──────────┐
│  注册页  │ ──────────────────────────────────→ │  后端     │
│          │ ←────────────────────────────────── │          │
└─────────┘     200 OK (邮件发送)                 └──────────┘
     │
     │ POST /api/register {name, email, password, code}
     ▼
┌─────────┐                                       ┌──────────┐
│  注册页  │ ──────────────────────────────────→ │  后端     │
│          │ ←────────────────────────────────── │          │
└─────────┘     200 OK {id, name, email}          └──────────┘
     │
     │ 跳转 /login
     ▼
┌─────────┐     POST /api/login {email, password} ┌──────────┐
│  登录页  │ ──────────────────────────────────→ │  后端     │
│          │ ←────────────────────────────────── │          │
└─────────┘     200 OK {token, user}               └──────────┘
     │
     │ Cookie: auth_token = token
     ▼
┌─────────┐
│  首页    │  已登录状态（isAuthenticated = true）
└─────────┘
```

---

> **维护者**：DevBit Tech 前端团队  
> **仓库**：[devbit-tech](https://github.com/devbit-tech)
