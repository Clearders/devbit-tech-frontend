import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createError, deleteCookie, getCookie, getHeader } from 'h3'
import type { H3Event } from 'h3'
import type {
  ForumBootstrap,
  ForumCategory,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser
} from '../../shared/forum'
import type { AuthUser } from '../../shared/auth'

interface DbUser {
  id: number
  name: string
  email: string
  password: string
  avatar: string
  isAdmin: boolean
}

interface DbSession {
  token: string
  userId: number
  expiresAt: string
}

interface DbVerificationCode {
  email: string
  code: string
  expiresAt: string
}

interface DbPost {
  id: number
  title: string
  content: string
  authorId: number
  category: ForumCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  viewCount: number
  likeUserIds: number[]
  isPinned: boolean
  isLocked: boolean
}

interface DbComment {
  id: number
  postId: number
  authorId: number
  content: string
  createdAt: string
}

interface DbMessage {
  id: number
  senderId: number
  recipientId: number
  content: string
  createdAt: string
  isRead: boolean
}

export interface ForumDatabase {
  users: DbUser[]
  sessions: DbSession[]
  verificationCodes: DbVerificationCode[]
  posts: DbPost[]
  comments: DbComment[]
  messages: DbMessage[]
}

const DB_FILE = resolve(process.cwd(), 'server/data/forum-db.json')
export const AUTH_COOKIE_NAME = 'auth_token'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000

function isoOffset(daysAgo: number, extraMs = 0) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + extraMs).toISOString()
}

function createSeedDatabase(): ForumDatabase {
  return {
    users: [
      {
        id: 1,
        name: 'Clearders',
        email: 'clearders@devbit.tech',
        password: 'Devbit123',
        avatar: 'CD',
        isAdmin: true
      },
      {
        id: 2,
        name: 'EpsilonHunter',
        email: 'epsilon@devbit.tech',
        password: 'Devbit123',
        avatar: 'EH',
        isAdmin: true
      },
      {
        id: 3,
        name: 'CodeMaster',
        email: 'codemaster@example.com',
        password: 'Devbit123',
        avatar: 'CM',
        isAdmin: false
      },
      {
        id: 4,
        name: 'DebugQueen',
        email: 'debugqueen@example.com',
        password: 'Devbit123',
        avatar: 'DQ',
        isAdmin: false
      },
      {
        id: 5,
        name: 'PixelArtist',
        email: 'pixelartist@example.com',
        password: 'Devbit123',
        avatar: 'PA',
        isAdmin: false
      },
      {
        id: 6,
        name: 'StackOverflow',
        email: 'stack@example.com',
        password: 'Devbit123',
        avatar: 'SO',
        isAdmin: false
      }
    ],
    sessions: [],
    verificationCodes: [],
    posts: [
      {
        id: 1,
        title: 'Welcome to the DevBit Tech forum',
        content:
          'This space is for product discussion, engineering notes, and community questions. Share what you are building and help other developers move faster.',
        authorId: 1,
        category: 'announcement',
        tags: ['community', 'announcement'],
        createdAt: isoOffset(7),
        updatedAt: isoOffset(7),
        viewCount: 1024,
        likeUserIds: [2, 3, 4, 5, 6],
        isPinned: true,
        isLocked: false
      },
      {
        id: 2,
        title: 'Rust vs Go for backend services',
        content:
          'Our team is comparing Rust and Go for service development. We care about performance, deploy speed, and team onboarding. Interested in real project tradeoffs.',
        authorId: 3,
        category: 'tech',
        tags: ['rust', 'go', 'backend'],
        createdAt: isoOffset(3),
        updatedAt: isoOffset(2),
        viewCount: 567,
        likeUserIds: [1, 2, 5],
        isPinned: false,
        isLocked: false
      },
      {
        id: 3,
        title: 'Nuxt 4 patterns we use in DevBit',
        content:
          'We are standardizing composables, route guards, and server-first data loading in Nuxt 4. Sharing the patterns that reduced state duplication in our app.',
        authorId: 2,
        category: 'devbit',
        tags: ['nuxt', 'vue', 'frontend'],
        createdAt: isoOffset(2),
        updatedAt: isoOffset(1),
        viewCount: 389,
        likeUserIds: [1, 3, 4, 5],
        isPinned: true,
        isLocked: false
      },
      {
        id: 4,
        title: 'Need advice on PostgreSQL query performance',
        content:
          'Our log queries became slow after the dataset grew. We already added indexes and tuned shared buffers. Looking for ideas around plans, partitions, and query shape.',
        authorId: 4,
        category: 'help',
        tags: ['postgresql', 'database', 'performance'],
        createdAt: isoOffset(1),
        updatedAt: isoOffset(1),
        viewCount: 234,
        likeUserIds: [2],
        isPinned: false,
        isLocked: false
      },
      {
        id: 5,
        title: 'Open source markdown editor release',
        content:
          'I released a lightweight markdown editor with preview, syntax highlight, and theme switching. Built with Vue 3 and CodeMirror 6. Feedback welcome.',
        authorId: 5,
        category: 'showcase',
        tags: ['opensource', 'markdown', 'vue'],
        createdAt: isoOffset(5),
        updatedAt: isoOffset(4),
        viewCount: 456,
        likeUserIds: [1, 2, 3, 4, 6],
        isPinned: false,
        isLocked: false
      },
      {
        id: 6,
        title: 'Game development from prototype to release',
        content:
          'A retrospective on choosing an engine, building the first prototype, and finishing the release pipeline. Happy to discuss tradeoffs and process.',
        authorId: 6,
        category: 'general',
        tags: ['game-dev', 'prototype', 'release'],
        createdAt: isoOffset(10),
        updatedAt: isoOffset(8),
        viewCount: 678,
        likeUserIds: [1, 3, 5],
        isPinned: false,
        isLocked: false
      }
    ],
    comments: [
      { id: 1, postId: 1, authorId: 3, content: 'Glad to see the forum live.', createdAt: isoOffset(6) },
      { id: 2, postId: 1, authorId: 4, content: 'Looking forward to more technical posts here.', createdAt: isoOffset(5) },
      { id: 3, postId: 1, authorId: 1, content: 'We will keep improving the experience.', createdAt: isoOffset(4) },
      { id: 4, postId: 2, authorId: 2, content: 'Rust is harder up front but pays off in maintenance.', createdAt: isoOffset(2) },
      { id: 5, postId: 2, authorId: 5, content: 'Go is still the fastest path when the team is small.', createdAt: isoOffset(1) },
      { id: 6, postId: 3, authorId: 4, content: 'The Nuxt 4 DX improvements are noticeable.', createdAt: isoOffset(0, -8 * 60 * 60 * 1000) },
      { id: 7, postId: 4, authorId: 3, content: 'Start with EXPLAIN ANALYZE and compare row estimates.', createdAt: isoOffset(0, -10 * 60 * 60 * 1000) },
      { id: 8, postId: 5, authorId: 6, content: 'This looks solid. I already starred it.', createdAt: isoOffset(3) }
    ],
    messages: [
      {
        id: 1,
        senderId: 1,
        recipientId: 3,
        content: 'Welcome to the community. Reach out if you need anything.',
        createdAt: isoOffset(5),
        isRead: true
      },
      {
        id: 2,
        senderId: 3,
        recipientId: 1,
        content: 'Thanks. The forum is shaping up well.',
        createdAt: isoOffset(4),
        isRead: true
      },
      {
        id: 3,
        senderId: 1,
        recipientId: 1,
        content: 'System note: your DevBit forum account is active.',
        createdAt: isoOffset(7),
        isRead: true
      },
      {
        id: 4,
        senderId: 4,
        recipientId: 1,
        content: 'Could you take a look at my database thread when you have time?',
        createdAt: isoOffset(0, -2 * 60 * 60 * 1000),
        isRead: false
      },
      {
        id: 5,
        senderId: 2,
        recipientId: 3,
        content: 'Your article draft is strong. Nice structure.',
        createdAt: isoOffset(0, -60 * 60 * 1000),
        isRead: false
      }
    ]
  }
}

async function ensureDatabaseFile() {
  try {
    await readFile(DB_FILE, 'utf8')
  } catch {
    await mkdir(dirname(DB_FILE), { recursive: true })
    await writeFile(DB_FILE, JSON.stringify(createSeedDatabase(), null, 2), 'utf8')
  }
}

export async function readDatabase() {
  await ensureDatabaseFile()
  const content = await readFile(DB_FILE, 'utf8')
  return JSON.parse(content) as ForumDatabase
}

export async function writeDatabase(database: ForumDatabase) {
  await ensureDatabaseFile()
  database.sessions = database.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > Date.now()
  )
  database.verificationCodes = database.verificationCodes.filter(
    (entry) => new Date(entry.expiresAt).getTime() > Date.now()
  )
  await writeFile(DB_FILE, JSON.stringify(database, null, 2), 'utf8')
}

export function nextId(items: { id: number }[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function sanitizeAuthUser(user: DbUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  }
}

export function sanitizeForumUser(user: DbUser): ForumUser {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    isAdmin: user.isAdmin
  }
}

function requireDbUser(database: ForumDatabase, userId: number) {
  const user = database.users.find((entry) => entry.id === userId)
  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: `User ${userId} is missing from the forum database.`
    })
  }
  return user
}

export function serializePost(
  database: ForumDatabase,
  post: DbPost,
  viewerUserId?: number | null
): ForumPost {
  const commentCount = database.comments.filter((comment) => comment.postId === post.id).length
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: sanitizeForumUser(requireDbUser(database, post.authorId)),
    category: post.category,
    tags: post.tags,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount,
    commentCount,
    likeCount: post.likeUserIds.length,
    likedByMe: viewerUserId ? post.likeUserIds.includes(viewerUserId) : false,
    isPinned: post.isPinned,
    isLocked: post.isLocked
  }
}

export function serializeComment(database: ForumDatabase, comment: DbComment): ForumComment {
  return {
    id: comment.id,
    postId: comment.postId,
    author: sanitizeForumUser(requireDbUser(database, comment.authorId)),
    content: comment.content,
    createdAt: comment.createdAt
  }
}

export function serializeMessage(database: ForumDatabase, message: DbMessage): ForumMessage {
  return {
    id: message.id,
    sender: sanitizeForumUser(requireDbUser(database, message.senderId)),
    recipient: sanitizeForumUser(requireDbUser(database, message.recipientId)),
    content: message.content,
    createdAt: message.createdAt,
    isRead: message.isRead
  }
}

export function sortPosts(posts: ForumPost[]) {
  return posts.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function createSession(database: ForumDatabase, userId: number) {
  const token = randomUUID()
  database.sessions.push({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString()
  })
  return token
}

export function destroySession(database: ForumDatabase, token: string) {
  database.sessions = database.sessions.filter((session) => session.token !== token)
}

export function generateVerificationCode(database: ForumDatabase, email: string) {
  const code = '123456'
  database.verificationCodes = database.verificationCodes.filter(
    (entry) => entry.email.toLowerCase() !== email.toLowerCase()
  )
  database.verificationCodes.push({
    email,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  })
  return code
}

export function consumeVerificationCode(database: ForumDatabase, email: string, code: string) {
  const match = database.verificationCodes.find(
    (entry) =>
      entry.email.toLowerCase() === email.toLowerCase() &&
      entry.code === code &&
      new Date(entry.expiresAt).getTime() > Date.now()
  )
  if (!match) {
    return false
  }
  database.verificationCodes = database.verificationCodes.filter((entry) => entry !== match)
  return true
}

export function buildBootstrap(
  database: ForumDatabase,
  viewerUserId?: number | null
): ForumBootstrap {
  const posts = sortPosts(
    database.posts.map((post) => serializePost(database, post, viewerUserId))
  )
  const users = database.users.map(sanitizeForumUser)
  const messages = viewerUserId
    ? database.messages
        .filter(
          (message) =>
            message.senderId === viewerUserId || message.recipientId === viewerUserId
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .map((message) => serializeMessage(database, message))
    : []

  return {
    users,
    posts,
    messages
  }
}

export function getTokenFromEvent(event: H3Event) {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }
  return getCookie(event, AUTH_COOKIE_NAME) ?? null
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, AUTH_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
}

export async function getOptionalAuthUser(event: H3Event) {
  const token = getTokenFromEvent(event)
  if (!token) {
    return null
  }
  const database = await readDatabase()
  const session = database.sessions.find(
    (entry) =>
      entry.token === token && new Date(entry.expiresAt).getTime() > Date.now()
  )
  if (!session) {
    clearAuthCookie(event)
    return null
  }
  const user = database.users.find((entry) => entry.id === session.userId)
  if (!user) {
    clearAuthCookie(event)
    return null
  }
  return sanitizeAuthUser(user)
}

export async function requireAuthUser(event: H3Event) {
  const token = getTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const database = await readDatabase()
  const session = database.sessions.find(
    (entry) =>
      entry.token === token && new Date(entry.expiresAt).getTime() > Date.now()
  )
  if (!session) {
    clearAuthCookie(event)
    throw createError({ statusCode: 401, statusMessage: 'Session expired. Please sign in again.' })
  }

  const user = database.users.find((entry) => entry.id === session.userId)
  if (!user) {
    clearAuthCookie(event)
    throw createError({ statusCode: 401, statusMessage: 'User not found for the current session.' })
  }

  return {
    database,
    token,
    dbUser: user,
    authUser: sanitizeAuthUser(user)
  }
}

export function assertAdmin(user: DbUser) {
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin privileges required.' })
  }
}

export function canModerate(user: DbUser, authorId: number) {
  return user.isAdmin || user.id === authorId
}
