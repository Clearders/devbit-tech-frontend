import { getOptionalAuthUser } from '../utils/forum-db'

export default defineEventHandler(async (event) => {
  return getOptionalAuthUser(event)
})
