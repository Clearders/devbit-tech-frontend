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

  return {
    message: `Verification code generated for development: ${code}`,
    expiresInSeconds: 600
  }
})
