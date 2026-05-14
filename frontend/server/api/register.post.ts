import type { AuthUser, RegisterPayload } from '../../shared/auth'
import {
  consumeVerificationCode,
  hashPassword,
  nextId,
  readDatabase,
  sanitizeAuthUser,
  writeDatabase
} from '../utils/forum-db'

export default defineEventHandler(async (event): Promise<AuthUser> => {
  const body = await readBody<RegisterPayload>(event)
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  const confirmPassword = body.confirm_password ?? ''
  const code = body.code?.trim() ?? ''

  if (!name || !email || !password || !confirmPassword || !code) {
    throw createError({ statusCode: 400, statusMessage: 'All registration fields are required.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide a valid email address.' })
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters and include letters and numbers.'
    })
  }
  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match.' })
  }

  const database = await readDatabase()
  if (database.users.some((entry) => entry.email.toLowerCase() === email)) {
    throw createError({ statusCode: 400, statusMessage: 'This email is already registered.' })
  }
  if (!consumeVerificationCode(database, email, code)) {
    throw createError({ statusCode: 400, statusMessage: 'Verification code is invalid or expired.' })
  }

  const user = {
    id: nextId(database.users),
    name,
    email,
    passwordHash: hashPassword(password),
    avatar: name.slice(0, 2).toUpperCase(),
    isAdmin: false
  }
  database.users.push(user)
  await writeDatabase(database)
  return sanitizeAuthUser(user)
})
