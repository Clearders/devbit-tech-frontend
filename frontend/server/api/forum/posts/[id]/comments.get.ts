import {
  readDatabase,
  serializeComment
} from '../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const database = await readDatabase()
  const postId = Number(getRouterParam(event, 'id'))
  const post = database.posts.find((entry) => entry.id === postId)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }

  return database.comments
    .filter((comment) => comment.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((comment) => serializeComment(database, comment))
})
