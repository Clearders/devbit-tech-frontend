import type { SendCodeResponse } from '../../../shared/auth'
import {
  generateVerificationCode,
  readDatabase,
  writeDatabase
} from '../../utils/forum-db'

export default defineEventHandler(async (event): Promise<SendCodeResponse> => {
  const body = await readBody<{ email?: string }>(event)
  const email = body.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email address is required.' })
  }

  const database = await readDatabase()
  const code = generateVerificationCode(database, email)
  await writeDatabase(database)

  const isProduction = process.env.NODE_ENV === 'production'
  return {
    message: isProduction
      ? 'Verification code sent. Please check your email.'
      : 'Verification code generated for development.',
    expiresInSeconds: 600,
    developmentCode: isProduction ? undefined : code
  }
})
