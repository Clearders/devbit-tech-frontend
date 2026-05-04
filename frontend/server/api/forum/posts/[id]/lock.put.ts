import {
  assertAdmin,
  requireAuthUser,
  serializePost,
  writeDatabase
} from '../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  assertAdmin(dbUser)

  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }

  post.isLocked = !post.isLocked
  post.updatedAt = new Date().toISOString()
  await writeDatabase(database)
  return serializePost(database, post, dbUser.id)
})
