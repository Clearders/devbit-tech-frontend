# DevBit Tech API

Last updated: 2026-05-05

This project now ships with a built-in Nitro API under `frontend/server/api`. The frontend uses the same contract in development and production through `runtimeConfig.public.apiBase = /api`.

## Base URL

- Development: `http://localhost:3000/api`
- Production preview: `/api`

## Authentication

- Auth is token-based.
- The frontend stores the token in the `auth_token` cookie.
- Authenticated requests also send `Authorization: Bearer <token>`.
- Session lifetime: 6 hours.

## Development Accounts

All seeded accounts use the same password: `Devbit123`

- `clearders@devbit.tech` (admin)
- `epsilon@devbit.tech` (admin)
- `codemaster@example.com`
- `debugqueen@example.com`
- `pixelartist@example.com`
- `stack@example.com`

## Verification Code

`POST /api/register/send_code` returns a development message containing the active code.

- Current generated code: `123456`
- Expiration: 10 minutes

## Shared Models

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

## Auth Endpoints

### `POST /api/login`

Request:

```json
{
  "email": "clearders@devbit.tech",
  "password": "Devbit123"
}
```

Response:

```json
{
  "token": "session-token",
  "user": {
    "id": 1,
    "name": "Clearders",
    "email": "clearders@devbit.tech"
  }
}
```

### `GET /api/me`

Returns the current authenticated user.

### `POST /api/register/send_code`

Request:

```json
{
  "email": "newuser@example.com"
}
```

Response:

```json
{
  "message": "Verification code generated for development: 123456",
  "expiresInSeconds": 600
}
```

### `POST /api/register`

Request:

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "Devbit123",
  "confirm_password": "Devbit123",
  "code": "123456"
}
```

Response:

```json
{
  "id": 7,
  "name": "New User",
  "email": "newuser@example.com"
}
```

## Forum Endpoints

### `GET /api/forum/bootstrap`

Returns the initial forum payload used by the frontend.

Response:

```json
{
  "users": [],
  "posts": [],
  "messages": []
}
```

### `GET /api/forum/users`

Returns all visible forum users.

### `GET /api/forum/posts`

Optional query:

- `category=<ForumCategory>`

### `GET /api/forum/posts/search?q=keyword`

Searches title, content, and tags.

### `GET /api/forum/posts/:id`

Returns a single post and increments `viewCount`.

### `POST /api/forum/posts`

Auth required.

```json
{
  "title": "My first thread",
  "content": "Thread body",
  "category": "tech",
  "tags": ["nuxt", "nitro"]
}
```

### `DELETE /api/forum/posts/:id`

Auth required. Allowed for the post author or admins.

### `PUT /api/forum/posts/:id/pin`

Admin only.

### `PUT /api/forum/posts/:id/lock`

Admin only.

### `PUT /api/forum/posts/:id/like`

Auth required. Toggles the current user's like state and returns the updated post.

## Comment Endpoints

### `GET /api/forum/posts/:id/comments`

Returns comments in chronological order.

### `POST /api/forum/posts/:id/comments`

Auth required. Locked posts reject comment creation.

```json
{
  "content": "Useful thread."
}
```

### `DELETE /api/forum/comments/:id`

Auth required. Allowed for the comment author or admins.

## Message Endpoints

### `GET /api/forum/messages`

Auth required. Returns all direct messages involving the current user.

### `POST /api/forum/messages`

Auth required.

```json
{
  "recipientId": 2,
  "content": "Can you review this post?"
}
```

### `PUT /api/forum/messages/:id/read`

Auth required. Marks one message as read.

### `PUT /api/forum/messages/conversation/:partnerId/read`

Auth required. Marks all incoming messages from the specified partner as read.

## Persistence

- Data file: `frontend/server/data/forum-db.json`
- The file is created automatically on first API access.
- Posts, comments, messages, sessions, and verification codes are persisted there.
