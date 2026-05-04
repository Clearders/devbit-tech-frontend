import {
  getOptionalAuthUser,
  readDatabase,
  serializePost,
  sortPosts
} from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  if (!search) {
    return []
  }

  const viewer = await getOptionalAuthUser(event)
  const database = await readDatabase()
  const posts = database.posts
    .filter((post) => {
      const haystack = [post.title, post.content, ...post.tags].join(' ').toLowerCase()
      return haystack.includes(search)
    })
    .map((post) => serializePost(database, post, viewer?.id ?? null))

  return sortPosts(posts)
})
