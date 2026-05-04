import {
  getOptionalAuthUser,
  readDatabase,
  serializePost,
  writeDatabase
} from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const viewer = await getOptionalAuthUser(event)
  const database = await readDatabase()
  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }

  post.viewCount += 1
  await writeDatabase(database)
  return serializePost(database, post, viewer?.id ?? null)
})
