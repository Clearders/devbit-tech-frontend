import { getOptionalAuthUser } from '../utils/forum-db'

export default defineEventHandler(async (event) => {
  const user = await getOptionalAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not signed in.' })
  }
  return user
})
