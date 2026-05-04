import type { SendMessagePayload } from '../../../shared/forum'
import {
  nextId,
  requireAuthUser,
  serializeMessage,
  writeDatabase
} from '../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  const body = await readBody<Partial<SendMessagePayload>>(event)
  const recipientId = Number(body.recipientId)
  const content = body.content?.trim()

  if (!recipientId || !content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipient and message content are required.'
    })
  }
  if (!database.users.some((user) => user.id === recipientId)) {
    throw createError({ statusCode: 404, statusMessage: 'Recipient not found.' })
  }

  const message = {
    id: nextId(database.messages),
    senderId: dbUser.id,
    recipientId,
    content,
    createdAt: new Date().toISOString(),
    isRead: false
  }
  database.messages.push(message)
  await writeDatabase(database)
  return serializeMessage(database, message)
})
