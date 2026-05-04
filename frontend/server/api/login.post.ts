import type { LoginResponse } from '../../shared/auth'
import {
  createSession,
  readDatabase,
  sanitizeAuthUser,
  writeDatabase
} from '../utils/forum-db'

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required.' })
  }

  const database = await readDatabase()
  const user = database.users.find(
    (entry) => entry.email.toLowerCase() === email && entry.password === password
  )

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
  }

  const token = createSession(database, user.id)
  await writeDatabase(database)
  setCookie(event, 'auth_token', token, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 6
  })

  return {
    token,
    user: sanitizeAuthUser(user)
  }
})
