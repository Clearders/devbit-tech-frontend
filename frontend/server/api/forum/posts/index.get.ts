import type { ForumCategory } from '../../../../shared/forum'
import {
  getOptionalAuthUser,
  readDatabase,
  serializePost,
  sortPosts
} from '../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = typeof query.category === 'string' ? (query.category as ForumCategory) : null
  const viewer = await getOptionalAuthUser(event)
  const database = await readDatabase()

  const posts = database.posts
    .filter((post) => !category || post.category === category)
    .map((post) => serializePost(database, post, viewer?.id ?? null))

  return sortPosts(posts)
})
