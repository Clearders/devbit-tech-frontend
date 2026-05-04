import { readDatabase, sanitizeForumUser } from '../../utils/forum-db'

export default defineEventHandler(async () => {
  const database = await readDatabase()
  return database.users.map(sanitizeForumUser)
})
