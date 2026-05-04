import { requireAuthUser, writeDatabase } from '../../../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const messageId = Number(getRouterParam(event, 'id'))
  const message = database.messages.find((entry) => entry.id === messageId)

  if (!message) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found.' })
  }
  if (message.recipientId !== dbUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot update this message.' })
  }

  message.isRead = true
  await writeDatabase(database)
  setResponseStatus(event, 204)
  return null
})
