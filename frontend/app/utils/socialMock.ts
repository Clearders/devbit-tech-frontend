import type { ForumMessage, ForumUser } from '../../shared/forum'
import type { ConversationPreferences, ConversationSummary, FriendGroup, FriendMetadata, FriendRequest, Page, SocialPreferences, SocialService, SocialUser, WorkspaceMessage } from '../../shared/social'
import { ApiFault } from './apiError'
import { mockForumPosts } from './forumMock'

export function createSocialMock(current: ForumUser, delay = 180, workspaceDemo: boolean | 'large' = false): SocialService {
  const members: ForumUser[] = [current,
    { id: 1001, name: '林间代码', avatar: '林', isAdmin: false },
    { id: 1002, name: '向量与光', avatar: '光', isAdmin: false },
    { id: 1003, name: '小步创作', avatar: '步', isAdmin: false },
    { id: 1004, name: '一页笔记', avatar: '页', isAdmin: false },
    ...(workspaceDemo ? ['像素漫游', '陈序', '微分的风', '蓝调终端', '山海之间', '周末造物', '白昼', '深蓝'].map((name, i) => ({ id: 1010 + i, name, avatar: name.slice(0, 1), isAdmin: false })) : []),
    ...(workspaceDemo === 'large' ? Array.from({ length: 48 }, (_, i) => ({ id: 1100 + i, name: i === 0 ? '在微小项目中探索无限可能的创作者与开源学习记录者' : `社区创作者 ${i + 1}`, avatar: '创', isAdmin: false })) : []),
  ].filter((u, i, all) => all.findIndex(v => v.id === u.id) === i)
  const friends = new Map<number, string>([[1001, new Date().toISOString()]])
  if (workspaceDemo) for (const id of members.filter(u => u.id >= 1010).map(u => u.id)) friends.set(id, new Date(Date.now() - id * 864000).toISOString())
  const groups: FriendGroup[] = workspaceDemo ? [{ id: 1, name: '一起写代码' }, { id: 2, name: '数学与图形' }] : []
  const metadata = new Map<number, FriendMetadata>()
  const conversationPrefs = new Map<number, ConversationPreferences>()
  const meta = (id: number) => metadata.get(id) ?? { note: '', starred: id === 1001, groupId: workspaceDemo ? id === 1001 ? 1 : id % 2 ? 1 : 2 : null }
  const prefs = (id: number) => conversationPrefs.get(id) ?? { pinned: id === 1001, muted: false, archived: false }
  const blocks = new Set<number>()
  let preferences: SocialPreferences = { messagePolicy: 'everyone', friendRequestPolicy: 'everyone' }
  let sequence = 2000
  const user = (id: number) => { const u = members.find(u => u.id === id); if (!u) throw new ApiFault('USER_NOT_FOUND', '用户不存在', 404); return u }
  const requests: FriendRequest[] = [{ id: 2001, sender: user(1002), recipient: current, message: '想一起交流数学和图形实验。', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
  sequence = 2001
  let messages: WorkspaceMessage[] = [{ id: 3001, sender: user(1001), recipient: current, content: '欢迎来交流学习与创作的想法！', isRead: false, createdAt: new Date().toISOString() }]
  if (workspaceDemo) messages = [
    { id: 2990, sender: user(1001), recipient: current, content: '你上次分享的图形实验很有意思，尤其是光照的部分。', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 2991, sender: current, recipient: user(1001), content: '谢谢！最近在试着用更简单的方式解释它，准备整理成一篇帖子。', isRead: true, createdAt: new Date(Date.now() - 80000000).toISOString() },
    ...messages,
    ...[1010, 1012, 1015].map((id, i) => ({ id: 3010 + i, sender: user(id), recipient: current, content: ['周末一起试试新的创意编程项目？', '把今天讨论的推导整理好了。', '新作品发到社区了，期待你的想法！'][i]!, isRead: i !== 0, createdAt: new Date(Date.now() - (i + 1) * 3600000).toISOString() })),
  ]
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
  const wait = async () => { if (delay) await new Promise(resolve => setTimeout(resolve, delay)) }
  const profile = (u: ForumUser): SocialUser => {
    const outgoing = requests.find(r => r.sender.id === current.id && r.recipient.id === u.id && r.status === 'pending')
    const incoming = requests.find(r => r.sender.id === u.id && r.recipient.id === current.id && r.status === 'pending')
    return { ...u, relationship: u.id === current.id ? 'self' : blocks.has(u.id) ? 'blocked' : friends.has(u.id) ? 'friends' : incoming ? 'incoming_pending' : outgoing ? 'outgoing_pending' : 'none', requestId: incoming?.id ?? outgoing?.id, canMessage: u.id !== current.id && !blocks.has(u.id) }
  }
  const paginate = <T>(items: T[], cursor?: string): Page<T> => {
    if (cursor && !/^\d+$/.test(cursor)) throw new ApiFault('BAD_CURSOR', '无效游标', 400)
    const offset = Number(cursor ?? 0), end = offset + 20
    return clone({ items: items.slice(offset, end), nextCursor: end < items.length ? String(end) : null, total: items.length })
  }
  const pending = (id: number, incoming: boolean) => {
    const r = requests.find(r => r.id === id)
    if (!r || r.status !== 'pending') throw new ApiFault('REQUEST_NOT_PENDING', '申请已经处理', 409)
    if ((incoming ? r.recipient.id : r.sender.id) !== current.id) throw new ApiFault('FORBIDDEN', '不允许处理', 403)
    return r
  }
  const decide = async (id: number, status: 'accepted' | 'rejected') => {
    await wait(); const r = pending(id, true); r.status = status; r.updatedAt = new Date().toISOString()
    if (status === 'accepted') friends.set(r.sender.id, r.updatedAt)
    return clone(r)
  }
  return {
    mode: 'mock', capabilities: { requests: true, blocks: true, preferences: true, presence: true, history: true, directory: true, profiles: true, metadata: true, groups: true, conversations: true, receipts: true },
    async listFriends(cursor, query = {}) { await wait(); return paginate([...friends].filter(([id]) => !blocks.has(id)).map(([id, createdAt]) => ({ user: profile(user(id)), createdAt, metadata: meta(id) })).filter(f => (!query.q || (f.user.name + f.metadata.note).includes(query.q.trim())) && (!query.starred || f.metadata.starred) && (!query.status || f.user.id % 3 !== 0) && (query.groupId === undefined || f.metadata.groupId === query.groupId)), cursor) },
    async getSummary() { await wait(); const ids = [...friends.keys()].filter(id => !blocks.has(id)); return { total: ids.length, online: ids.filter(id => id % 3 !== 0).length, starred: ids.filter(id => meta(id).starred).length, incoming: requests.filter(r => r.recipient.id === current.id && r.status === 'pending').length } },
    async getProfile(id) { await wait(); return clone({ ...profile(user(id)), bio: id === 1001 ? '在代码与自然之间寻找灵感。喜欢开源、小而美的工具，还有周末的咖啡。' : '学习、记录，偶尔把脑海里的想法做成小作品。', interests: id % 2 ? ['开源', '创意编程', 'Web 开发'] : ['数学', '计算机图形', '学习笔记'], recentPosts: mockForumPosts().filter(p => p.author.id === id).map(p => ({ id: p.id, title: p.title })) }) },
    async updateFriend(id, value) { await wait(); if (!friends.has(id)) throw new ApiFault('RELATIONSHIP_CHANGED', '已不是好友', 409); if (value.groupId != null && !groups.some(g => g.id === value.groupId)) throw new ApiFault('VALIDATION_FAILED', '分组不存在', 422); const next = { ...meta(id), ...value }; metadata.set(id, next); return clone(next) },
    async getFriendMetadata(id) { await wait(); if (!friends.has(id) || blocks.has(id)) throw new ApiFault('RELATIONSHIP_CHANGED', '关系已变化', 409); return clone(meta(id)) },
    async listGroups() { await wait(); return clone(groups) },
    async createGroup(name) { await wait(); if (!name.trim() || name.trim().length > 30) throw new ApiFault('VALIDATION_FAILED', '分组名称无效', 422); const group = { id: ++sequence, name: name.trim() }; groups.push(group); return clone(group) },
    async renameGroup(id, name) { await wait(); const group = groups.find(g => g.id === id); if (!group || !name.trim() || name.trim().length > 30) throw new ApiFault('VALIDATION_FAILED', '分组名称无效', 422); group.name = name.trim(); return clone(group) },
    async deleteGroup(id) { await wait(); for (const friendId of friends.keys()) { if (meta(friendId).groupId === id) metadata.set(friendId, { ...meta(friendId), groupId: null }) }; const index = groups.findIndex(g => g.id === id); if (index !== -1) groups.splice(index, 1) },
    async listConversations(cursor) { await wait(); const ids = [...new Set(messages.map(m => m.sender.id === current.id ? m.recipient.id : m.sender.id))]; return paginate(ids.map(id => ({ user: profile(user(id)), lastMessage: messages.filter(m => m.sender.id === id || m.recipient.id === id).at(-1)!, unread: messages.filter(m => m.sender.id === id && !m.isRead).length, preferences: prefs(id) })).sort((a, b) => Number(b.preferences.pinned) - Number(a.preferences.pinned) || b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt)), cursor) },
    async updateConversation(id, value) { await wait(); user(id); const next = { ...prefs(id), ...value }; conversationPrefs.set(id, next); return clone(next) },
    async listHistory(id, cursor) { await wait(); user(id); return paginate(messages.filter(m => m.sender.id === id || m.recipient.id === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), cursor) },
    async searchUsers(q, cursor) { await wait(); return paginate(members.filter(u => u.name.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())).map(profile), cursor) },
    async listRequests(direction, cursor) { await wait(); return paginate(requests.filter(r => r.status === 'pending' && (direction === 'incoming' ? r.recipient.id : r.sender.id) === current.id), cursor) },
    async requestFriend(id, message = '') {
      await wait(); user(id)
      if (id === current.id || blocks.has(id)) throw new ApiFault('FORBIDDEN', '不允许添加', 403)
      const existing = requests.find(r => r.sender.id === current.id && r.recipient.id === id && r.status === 'pending')
      if (existing) return clone(existing)
      if (profile(user(id)).relationship !== 'none') throw new ApiFault('RELATIONSHIP_CHANGED', '关系已变化', 409)
      const now = new Date().toISOString()
      const r: FriendRequest = { id: ++sequence, sender: current, recipient: user(id), message, status: 'pending', createdAt: now, updatedAt: now }
      requests.push(r); return clone(r)
    },
    acceptRequest: id => decide(id, 'accepted'), rejectRequest: id => decide(id, 'rejected'),
    async cancelRequest(id) { await wait(); const r = pending(id, false); r.status = 'cancelled'; r.updatedAt = new Date().toISOString() },
    async removeFriend(id) { await wait(); friends.delete(id) },
    async listBlocks(cursor) { await wait(); return paginate([...blocks].map(id => profile(user(id))), cursor) },
    async block(id) { await wait(); user(id); if (id === current.id) throw new ApiFault('FORBIDDEN', '不能屏蔽自己', 403); blocks.add(id) },
    async unblock(id) { await wait(); blocks.delete(id) },
    async getPreferences() { await wait(); return clone(preferences) },
    async updatePreferences(value) { await wait(); preferences = { ...preferences, ...value }; return clone(preferences) },
    async getPresence(userIds) { await wait(); return { users: userIds.map(userId => ({ userId, status: userId % 3 !== 0 ? 'online' as const : 'offline' as const })), generatedAt: new Date().toISOString() } },
    async clearHistory(id) { await wait(); messages = messages.filter(m => m.sender.id !== id && m.recipient.id !== id) },
    async listMessages() { await wait(); return clone(messages) },
    async sendMessage(id, content, clientMessageId) { await wait(); if (!profile(user(id)).canMessage) throw new ApiFault('FORBIDDEN', '隐私设置限制', 403); const existing = clientMessageId && messages.find(m => m.clientMessageId === clientMessageId); if (existing) return clone(existing); const m: WorkspaceMessage = { id: ++sequence + 3000, sender: current, recipient: user(id), content, isRead: false, createdAt: new Date().toISOString(), clientMessageId }; messages.push(m); return clone(m) },
    async markConversationRead(id, lastReadMessageId) { await wait(); messages.forEach(m => { if (m.sender.id === id && m.recipient.id === current.id && (lastReadMessageId === undefined || m.id <= lastReadMessageId)) m.isRead = true }) },
    async markMessageRead(id) { await wait(); const m = messages.find(m => m.id === id && m.recipient.id === current.id); if (m) m.isRead = true },
  }
}
