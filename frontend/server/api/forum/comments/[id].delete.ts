import { canModerate, requireAuthUser, writeDatabase } from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const commentId = Number(getRouterParam(event, 'id'))
  const comment = database.comments.find((entry) => entry.id === commentId)

  if (!comment) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found.' })
  }
  if (!canModerate(dbUser, comment.authorId)) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot delete this comment.' })
  }

  database.comments = database.comments.filter((entry) => entry.id !== commentId)
  await writeDatabase(database)
  setResponseStatus(event, 204)
  return null
})
