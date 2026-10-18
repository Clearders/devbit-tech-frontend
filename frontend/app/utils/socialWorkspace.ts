import type { ForumMessage } from '../../shared/forum'
import type { ConversationSummary, WorkspaceMessage } from '../../shared/social'

export function mergeMessages(current: WorkspaceMessage[], incoming: WorkspaceMessage[]) {
  const byId = new Map(current.map(m => [m.id, m]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
}
export function summarizeMessages(messages: ForumMessage[], owner: number): ConversationSummary[] {
  const groups = new Map<number, ForumMessage[]>()
  for (const message of messages) {
    if (message.sender.id !== owner && message.recipient.id !== owner) continue
    const id = message.sender.id === owner ? message.recipient.id : message.sender.id
    groups.set(id, [...(groups.get(id) ?? []), message])
  }
  return [...groups].map(([id, rows]) => {
    const lastMessage = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)[0]!
    const user = lastMessage.sender.id === id ? lastMessage.sender : lastMessage.recipient
    return { user: { ...user, relationship: 'none' as const, canMessage: true }, lastMessage, unread: rows.filter(m => m.recipient.id === owner && !m.isRead).length, preferences: { pinned: false, muted: false, archived: false } }
  }).sort((a, b) => b.lastMessage!.createdAt.localeCompare(a.lastMessage!.createdAt))
}

export function attachment(content: string): { kind: 'image' | 'file'; url: string; name: string } | null {
  const match = content.match(/^(!?)\[([^\]]*)\]\((data:[^)]+)\)$/s)
  if (!match) return null
  const url = match[3]!, image = match[1] === '!'
  if (image ? !/^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[A-Za-z0-9+/=\s]+$/i.test(url) : !/^data:[\w.+/-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(url)) return null
  return { kind: image ? 'image' : 'file', url, name: match[2] || '附件' }
}
export function messagePreview(content: string) {
  const file = attachment(content)
  return file ? file.kind === 'image' ? '[图片]' : `[文件] ${file.name}` : content
}
