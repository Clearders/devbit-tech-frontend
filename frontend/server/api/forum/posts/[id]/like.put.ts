import {
  requireAuthUser,
  serializePost,
  writeDatabase
} from '../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }

  if (post.likeUserIds.includes(dbUser.id)) {
    post.likeUserIds = post.likeUserIds.filter((id) => id !== dbUser.id)
  } else {
    post.likeUserIds.push(dbUser.id)
  }
  await writeDatabase(database)
  return serializePost(database, post, dbUser.id)
})
