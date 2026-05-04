import { requireAuthUser, serializeMessage } from '../../utils/forum-db'

export default defineEventHandler(async (event) => {
  const { database, dbUser } = await requireAuthUser(event)
  return database.messages
    .filter(
      (message) =>
        message.senderId === dbUser.id || message.recipientId === dbUser.id
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((message) => serializeMessage(database, message))
})
