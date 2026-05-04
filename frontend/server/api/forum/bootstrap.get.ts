import { buildBootstrap, getOptionalAuthUser, readDatabase } from '../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const viewer = await getOptionalAuthUser(event)
  const database = await readDatabase()
  return buildBootstrap(database, viewer?.id ?? null)
})
