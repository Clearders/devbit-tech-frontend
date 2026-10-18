import type { FriendInfo, ForumMessage, ForumUser } from '../../shared/forum'
import type { FriendRequest, Friendship, Page, PresenceSnapshot, SocialCapabilities, SocialPreferences, SocialService, SocialUser } from '../../shared/social'
import { ApiFault } from './apiError'

export type SocialFetch = <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; params?: Record<string, unknown> }) => Promise<T>

function page<T>(value: Page<T>): Page<T> {
  if (!value || !Array.isArray(value.items) || !(value.nextCursor === null || typeof value.nextCursor === 'string')) {
    throw new ApiFault('BAD_RESPONSE', '分页响应格式不正确')
  }
  return value
}

export function createSocialService(fetch: SocialFetch, mode: 'legacy' | 'v2', currentUserId: number, optional: Partial<SocialCapabilities> = {}): SocialService {
  const root = '/v2/social'
  const requestPath = (id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiFault('BAD_RESPONSE', '申请标识缺失')
    return root + `/friend-requests/${id}`
  }
  const capabilities: SocialCapabilities = {
    requests: mode === 'v2', blocks: false, preferences: false, presence: false, history: false, ...optional,
  }
  if (mode === 'legacy') Object.keys(capabilities).forEach(key => { capabilities[key as keyof SocialCapabilities] = false })
  capabilities.groups = !!capabilities.groups && !!capabilities.metadata
  capabilities.receipts = !!capabilities.receipts && !!capabilities.conversations
  const requireCapability = (key: keyof SocialCapabilities) => {
    if (!capabilities[key]) throw new ApiFault('FEATURE_NOT_READY', '功能尚未适配')
  }
  const getPage = async <T>(path: string, params?: Record<string, unknown>) => page(await fetch<Page<T>>(root + path, { params }))
  const profile = (user: ForumUser, contacts: FriendInfo[]): SocialUser => ({
    ...user,
    relationship: user.id === currentUserId ? 'self' : contacts.some(f => f.user.id === user.id) ? 'contact' : 'none',
    canMessage: user.id !== currentUserId,
  })
  return {
    mode, capabilities,
    async listFriends(cursor, query = {}) {
      if (mode === 'v2') return getPage<Friendship>('/friends', { cursor, ...(capabilities.directory ? { ...query, groupId: query.groupId === null ? 'null' : query.groupId } : {}) })
      const contacts = await fetch<FriendInfo[]>('/forum/friends')
      return { items: contacts.map(f => ({ ...f, user: profile(f.user, contacts) })), nextCursor: null }
    },
    async getSummary() { requireCapability('directory'); return fetch(root + '/summary') },
    async getProfile(id) { requireCapability('profiles'); return fetch(root + `/users/${id}/profile`) },
    async updateFriend(id, body) { requireCapability('metadata'); return fetch(root + `/friends/${id}/metadata`, { method: 'PATCH', body }) },
    async getFriendMetadata(id) { requireCapability('metadata'); return fetch(root + `/friends/${id}/metadata`) },
    async listGroups() { requireCapability('groups'); return fetch(root + '/groups') },
    async createGroup(name) { requireCapability('groups'); return fetch(root + '/groups', { method: 'POST', body: { name } }) },
    async renameGroup(id, name) { requireCapability('groups'); return fetch(root + `/groups/${id}`, { method: 'PATCH', body: { name } }) },
    async deleteGroup(id) { requireCapability('groups'); await fetch(root + `/groups/${id}`, { method: 'DELETE' }) },
    async listConversations(cursor) { requireCapability('conversations'); return getPage('/conversations', { cursor }) },
    async updateConversation(id, body) { requireCapability('conversations'); return fetch(root + `/conversations/${id}/preferences`, { method: 'PATCH', body }) },
    async listHistory(id, cursor) { requireCapability('conversations'); return getPage(`/conversations/${id}/messages`, { cursor }) },
    async searchUsers(q, cursor) {
      if (mode === 'v2') return getPage<SocialUser>('/users', { q, cursor })
      const [users, contacts] = await Promise.all([fetch<ForumUser[]>('/forum/users/search', { params: { q } }), fetch<FriendInfo[]>('/forum/friends')])
      return { items: users.map(u => profile(u, contacts)), nextCursor: null }
    },
    async listRequests(direction, cursor) { requireCapability('requests'); return getPage<FriendRequest>('/friend-requests', { direction, status: 'pending', cursor }) },
    async requestFriend(recipientId, message = '') {
      if (mode === 'v2') return fetch<FriendRequest>(root + '/friend-requests', { method: 'POST', body: { recipientId, message } })
      const f = await fetch<FriendInfo>('/forum/friends', { method: 'POST', body: { friendId: recipientId } })
      return { ...f, user: profile(f.user, [f]) }
    },
    async acceptRequest(id) { requireCapability('requests'); return fetch(requestPath(id) + '/accept', { method: 'POST' }) },
    async rejectRequest(id) { requireCapability('requests'); return fetch(requestPath(id) + '/reject', { method: 'POST' }) },
    async cancelRequest(id) { requireCapability('requests'); await fetch(requestPath(id), { method: 'DELETE' }) },
    async removeFriend(id) { await fetch(mode === 'v2' ? root + `/friends/${id}` : `/forum/friends/${id}`, { method: 'DELETE' }) },
    async listBlocks(cursor) { requireCapability('blocks'); return getPage<SocialUser>('/blocks', { cursor }) },
    async block(id) { requireCapability('blocks'); await fetch(root + `/blocks/${id}`, { method: 'PUT' }) },
    async unblock(id) { requireCapability('blocks'); await fetch(root + `/blocks/${id}`, { method: 'DELETE' }) },
    async getPreferences() { requireCapability('preferences'); return fetch<SocialPreferences>(root + '/preferences') },
    async updatePreferences(body) { requireCapability('preferences'); return fetch<SocialPreferences>(root + '/preferences', { method: 'PATCH', body }) },
    async getPresence(userIds) { requireCapability('presence'); return fetch<PresenceSnapshot>(root + '/presence', { params: { userIds: userIds.join(',') } }) },
    async clearHistory(id) { requireCapability('history'); await fetch(root + `/conversations/${id}/history`, { method: 'DELETE' }) },
    listMessages: () => fetch<ForumMessage[]>('/forum/messages'),
    sendMessage: (recipientId, content, clientMessageId) => fetch(capabilities.conversations ? root + `/conversations/${recipientId}/messages` : '/forum/messages', { method: 'POST', body: { recipientId, content, ...(capabilities.conversations ? { clientMessageId } : {}) } }),
    async markConversationRead(id, lastReadMessageId) { await fetch(capabilities.conversations ? root + `/conversations/${id}/read` : `/forum/messages/conversation/${id}/read`, { method: 'PUT', ...(capabilities.conversations ? { body: { lastReadMessageId } } : {}) }) },
    async markMessageRead(id) { await fetch(`/forum/messages/${id}/read`, { method: 'PUT' }) },
  }
}
