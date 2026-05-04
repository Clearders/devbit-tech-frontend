import { requireAuthUser, writeDatabase } from '../../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const partnerId = Number(getRouterParam(event, 'partnerId'))

  database.messages.forEach((message) => {
    if (message.senderId === partnerId && message.recipientId === dbUser.id) {
      message.isRead = true
    }
  })

  await writeDatabase(database)
  setResponseStatus(event, 204)
  return null
})
