import { nextId, requireAuthUser, serializeComment, writeDatabase } from '../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)
  const body = await readBody<{ content?: string }>(event)
  const content = body.content?.trim()

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }
  if (post.isLocked) {
    throw createError({ statusCode: 403, statusMessage: 'This post is locked.' })
  }
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: 'Comment content is required.' })
  }

  const comment = {
    id: nextId(database.comments),
    postId,
    authorId: dbUser.id,
    content,
    createdAt: new Date().toISOString()
  }
  database.comments.push(comment)
  await writeDatabase(database)
  return serializeComment(database, comment)
})
