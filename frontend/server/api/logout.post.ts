import { clearAuthCookie, destroySession, getTokenFromEvent, readDatabase, writeDatabase } from '../utils/forum-db'

export default defineEventHandler(async (event) => {
  const token = getTokenFromEvent(event)

  if (token) {
    const database = await readDatabase()
    destroySession(database, token)
    await writeDatabase(database)
  }

  clearAuthCookie(event)
  return { success: true }
})
