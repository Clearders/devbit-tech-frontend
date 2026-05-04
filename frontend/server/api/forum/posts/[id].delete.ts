import { canModerate, requireAuthUser, writeDatabase } from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }
  if (!canModerate(dbUser, post.authorId)) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot delete this post.' })
  }

  database.posts = database.posts.filter((entry) => entry.id !== postId)
  database.comments = database.comments.filter((entry) => entry.postId !== postId)
  await writeDatabase(database)
  setResponseStatus(event, 204)
  return null
})
