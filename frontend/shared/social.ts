import type { ForumMessage, ForumUser } from './forum'

export type SocialMode = 'legacy' | 'v2' | 'mock'
export type RelationshipState = 'self' | 'none' | 'contact' | 'outgoing_pending' | 'incoming_pending' | 'friends' | 'blocked'
export type RequestDirection = 'incoming' | 'outgoing'
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export interface Page<T> { items: T[]; nextCursor: string | null; total?: number }
export interface FriendMetadata { note: string; starred: boolean; groupId: number | null }
export interface FriendGroup { id: number; name: string }
export interface FriendQuery { q?: string; status?: 'online'; starred?: boolean; groupId?: number | null }
export interface SocialSummary { total: number; online: number; starred: number; incoming: number }
export interface SocialProfile extends SocialUser {
  bio?: string
  interests?: string[]
  recentPosts?: { id: number; title: string }[]
}
export interface ConversationPreferences { pinned: boolean; muted: boolean; archived: boolean }
export interface ConversationSummary {
  user: SocialUser
  lastMessage: ForumMessage | null
  unread: number
  preferences: ConversationPreferences
}
export interface WorkspaceMessage extends ForumMessage { clientMessageId?: string }
export interface OutboxMessage { clientMessageId: string; recipientId: number; content: string; createdAt: string; status: 'sending' | 'failed'; error?: string }
export interface SocialUser extends ForumUser {
  relationship: RelationshipState
  requestId?: number
  canMessage: boolean
}
export interface Friendship { user: SocialUser; createdAt: string; metadata?: FriendMetadata }
export interface FriendRequest {
  id: number
  sender: ForumUser
  recipient: ForumUser
  message: string
  status: RequestStatus
  createdAt: string
  updatedAt: string
}
export interface PresenceSnapshot {
  users: { userId: number; status: 'online' | 'offline' | 'unknown' }[]
  generatedAt: string
}
export interface SocialPreferences {
  messagePolicy: 'everyone' | 'friends' | 'nobody'
  friendRequestPolicy: 'everyone' | 'nobody'
}
export interface SocialCapabilities {
  requests: boolean
  blocks: boolean
  preferences: boolean
  presence: boolean
  history: boolean
  directory?: boolean
  profiles?: boolean
  metadata?: boolean
  groups?: boolean
  conversations?: boolean
  receipts?: boolean
}
export type SocialEventType = 'friend_request_received' | 'friend_request_updated' | 'friendship_changed' | 'presence_snapshot' | 'presence_changed' | 'friend_metadata_changed' | 'friend_group_changed' | 'conversation_changed' | 'conversation_read'
export interface SocialEvent { type: SocialEventType; userId?: number; requestId?: number }
export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors?: Record<string, string>
  retryAfterSeconds?: number
}
export interface SocialService {
  mode: SocialMode
  capabilities: SocialCapabilities
  listFriends(cursor?: string, query?: FriendQuery): Promise<Page<Friendship>>
  getSummary(): Promise<SocialSummary>
  getProfile(userId: number): Promise<SocialProfile>
  updateFriend(userId: number, value: Partial<FriendMetadata>): Promise<FriendMetadata>
  getFriendMetadata(userId: number): Promise<FriendMetadata>
  listGroups(): Promise<FriendGroup[]>
  createGroup(name: string): Promise<FriendGroup>
  renameGroup(id: number, name: string): Promise<FriendGroup>
  deleteGroup(id: number): Promise<void>
  listConversations(cursor?: string): Promise<Page<ConversationSummary>>
  updateConversation(userId: number, value: Partial<ConversationPreferences>): Promise<ConversationPreferences>
  listHistory(userId: number, cursor?: string): Promise<Page<WorkspaceMessage>>
  searchUsers(query: string, cursor?: string): Promise<Page<SocialUser>>
  listRequests(direction: RequestDirection, cursor?: string): Promise<Page<FriendRequest>>
  requestFriend(userId: number, message?: string): Promise<FriendRequest | Friendship>
  acceptRequest(id: number): Promise<FriendRequest>
  rejectRequest(id: number): Promise<FriendRequest>
  cancelRequest(id: number): Promise<void>
  removeFriend(userId: number): Promise<void>
  listBlocks(cursor?: string): Promise<Page<SocialUser>>
  block(userId: number): Promise<void>
  unblock(userId: number): Promise<void>
  getPreferences(): Promise<SocialPreferences>
  updatePreferences(value: Partial<SocialPreferences>): Promise<SocialPreferences>
  getPresence(userIds: number[]): Promise<PresenceSnapshot>
  clearHistory(userId: number): Promise<void>
  listMessages(): Promise<ForumMessage[]>
  sendMessage(recipientId: number, content: string, clientMessageId?: string): Promise<WorkspaceMessage>
  markConversationRead(userId: number, lastReadMessageId?: number): Promise<void>
  markMessageRead(messageId: number): Promise<void>
}
