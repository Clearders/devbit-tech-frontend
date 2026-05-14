import type { CreatePostPayload } from '../../../../shared/forum'
import { FORUM_CATEGORIES } from '../../../../shared/forum'
import {
  nextId,
  requireAuthUser,
  serializePost,
  writeDatabase
} from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const body = await readBody<Partial<CreatePostPayload>>(event)
  const title = body.title?.trim()
  const content = body.content?.trim()
  const category = body.category ?? 'general'
  const tags = Array.isArray(body.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : []

  if (!title || !content) {
    throw createError({ statusCode: 400, statusMessage: 'Title and content are required.' })
  }
  if (!FORUM_CATEGORIES.some((entry) => entry.value === category)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid forum category.' })
  }

  const post = {
    id: nextId(database.posts),
    title,
    content,
    authorId: dbUser.id,
    category,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewCount: 0,
    likeUserIds: [],
    isPinned: false,
    isLocked: false
  }

  database.posts.unshift(post)
  await writeDatabase(database)
  return serializePost(database, post, dbUser.id)
})
