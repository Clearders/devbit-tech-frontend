import type { EffectScope } from 'vue'
import type { ForumUser } from '~~/shared/forum'
import type { ConversationSummary, FriendGroup, FriendQuery, FriendRequest, Friendship, OutboxMessage, SocialPreferences, SocialProfile, SocialService, SocialSummary, SocialUser, WorkspaceMessage } from '~~/shared/social'
import { apiErrorMessage } from '~/utils/apiError'
import { mergeMessages, summarizeMessages } from '~/utils/socialWorkspace'

interface WorkspaceState {
  friends: Friendship[]; friendRecords: Record<number, Friendship>; friendsCursor: string | null; friendsTotal: number | null; friendQuery: FriendQuery
  incoming: FriendRequest[]; outgoing: FriendRequest[]; requestCursors: { incoming: string | null; outgoing: string | null }
  groups: FriendGroup[]; summary: SocialSummary | null; blocked: SocialUser[]; blocksCursor: string | null
  preferences: SocialPreferences; settingsLoaded: boolean
  presence: Record<number, string>; members: Record<number, SocialUser>; profiles: Record<number, SocialProfile>
  conversations: ConversationSummary[]; conversationsCursor: string | null
  messages: WorkspaceMessage[]; histories: Record<number, { loaded: boolean; cursor: string | null }>
  drafts: Record<number, string>; outbox: OutboxMessage[]
  draftAttachments: Record<number, { name: string; content: string; image: boolean; url: string }[]>
  busy: Record<string, boolean>; errors: Record<string, string>; notice: string; initialized: boolean
  friendsView: string; scroll: number
}
function initial(): WorkspaceState {
  return { friends: [], friendRecords: {}, friendsCursor: null, friendsTotal: null, friendQuery: {}, incoming: [], outgoing: [], requestCursors: { incoming: null, outgoing: null }, groups: [], summary: null, blocked: [], blocksCursor: null, preferences: { messagePolicy: 'everyone', friendRequestPolicy: 'everyone' }, settingsLoaded: false, presence: {}, members: {}, profiles: {}, conversations: [], conversationsCursor: null, messages: [], histories: {}, drafts: {}, draftAttachments: {}, outbox: [], busy: {}, errors: {}, notice: '', initialized: false, friendsView: 'all', scroll: 0 }
}
interface Runtime { owner: number | null; generation: number; scope: EffectScope | null; serial: Record<string, number>; friendQueryKey?: string }
const runtimes = new WeakMap<object, Runtime>()

export function useSocialWorkspace() {
  const app = useNuxtApp(), auth = useAuth(), ws = useWebSocket()
  const state = useState<WorkspaceState>('social_workspace', initial)
  const forumUsers = useState<ForumUser[]>('forum_users', () => [])
  let runtime = runtimes.get(app)
  if (!runtime) { runtime = { owner: auth.user.value?.id ?? null, generation: 0, scope: null, serial: {} }; runtimes.set(app, runtime) }
  const rt = runtime
  let serviceOwner = auth.user.value?.id, currentService = useSocialApi()
  const service = (): SocialService => {
    if (serviceOwner !== auth.user.value?.id) app.runWithContext(() => { currentService = useSocialApi(); serviceOwner = auth.user.value?.id })
    return currentService
  }
  const api = computed(service)
  const session = () => ({ owner: auth.user.value?.id, generation: rt.generation })
  const valid = (ticket: ReturnType<typeof session>) => ticket.owner === auth.user.value?.id && ticket.generation === rt.generation
  function remember(users: SocialUser[]) { for (const user of users) { state.value.members[user.id] = user; if (state.value.profiles[user.id]) state.value.profiles[user.id] = { ...state.value.profiles[user.id]!, ...user } } }
  async function read<T>(key: string, load: () => Promise<T>, apply: (value: T) => void) {
    const ticket = session(), serial = rt.serial[key] = (rt.serial[key] ?? 0) + 1
    state.value.busy[key] = true; state.value.errors[key] = ''
    try { const value = await load(); if (valid(ticket) && rt.serial[key] === serial) apply(value) }
    catch (e) { if (valid(ticket) && rt.serial[key] === serial) { state.value.errors[key] = apiErrorMessage(e); if (key === 'presence') state.value.presence = {}; if (key === 'summary') state.value.summary = null } }
    finally { if (valid(ticket) && rt.serial[key] === serial) state.value.busy[key] = false }
  }
  function loadFriends(append = false) {
    const s = service(), query = { ...state.value.friendQuery }, cursor = append ? state.value.friendsCursor ?? undefined : undefined
    const queryKey = JSON.stringify(query)
    if (!append && rt.friendQueryKey !== queryKey) { state.value.friends = []; state.value.friendsTotal = null; state.value.friendsCursor = null; rt.friendQueryKey = queryKey }
    return read('friends', () => s.listFriends(cursor, query), page => {
      state.value.friends = append ? [...new Map([...state.value.friends, ...page.items].map(f => [f.user.id, f])).values()] : page.items
      state.value.friendsCursor = page.nextCursor; state.value.friendsTotal = page.total ?? null
      if (s.mode === 'legacy') state.value.friendRecords = {}
      remember(page.items.map(f => f.user))
      for (const friend of page.items) state.value.friendRecords[friend.user.id] = friend
      if (s.capabilities.presence && (s.mode === 'mock' || ws.status.value === 'connected')) void loadPresence()
    })
  }
  function loadPresence() {
    const s = service()
    if (!s.capabilities.presence || (s.mode !== 'mock' && ws.status.value !== 'connected')) { state.value.presence = {}; return Promise.resolve() }
    return read('presence', () => s.getPresence(state.value.friends.map(f => f.user.id)), snapshot => { state.value.presence = Object.fromEntries(snapshot.users.map(p => [p.userId, p.status])) })
  }
  function loadRequests(direction: 'incoming' | 'outgoing', append = false) {
    const s = service(); if (!s.capabilities.requests) return Promise.resolve()
    return read(direction, () => s.listRequests(direction, append ? state.value.requestCursors[direction] ?? undefined : undefined), page => {
      state.value[direction] = append ? [...new Map([...state.value[direction], ...page.items].map(r => [r.id, r])).values()] : page.items
      state.value.requestCursors[direction] = page.nextCursor
    })
  }
  function loadGroups() { const s = service(); return s.capabilities.groups ? read('groups', () => s.listGroups(), value => { state.value.groups = value }) : Promise.resolve() }
  function loadSummary() { const s = service(); return s.capabilities.directory ? read('summary', () => s.getSummary(), value => { state.value.summary = value }) : Promise.resolve() }
  async function refresh() { const ticket = session(); await Promise.all([loadFriends(), loadRequests('incoming'), loadRequests('outgoing'), loadGroups(), loadSummary()]); if (valid(ticket)) state.value.initialized = true }
  function loadSettings(append = false) {
    const s = service()
    return Promise.all([
      s.capabilities.blocks ? read('blocks', () => s.listBlocks(append ? state.value.blocksCursor ?? undefined : undefined), p => { state.value.blocked = append ? [...state.value.blocked, ...p.items] : p.items; state.value.blocksCursor = p.nextCursor; remember(p.items) }) : Promise.resolve(),
      s.capabilities.preferences && !append ? read('preferences', () => s.getPreferences(), p => { state.value.preferences = p; state.value.settingsLoaded = true }) : Promise.resolve(),
    ])
  }
  async function loadProfile(id: number, known?: ForumUser) {
    const s = service(), ticket = session()
    if (known && !state.value.members[id]) remember(['relationship' in known ? known as SocialUser : { ...known, relationship: 'none', canMessage: s.mode === 'legacy' }])
    if (s.capabilities.profiles) await read(`profile:${id}`, () => s.getProfile(id), value => { state.value.profiles[id] = value; remember([value]) })
    else {
      const member = state.value.members[id] ?? state.value.friends.find(f => f.user.id === id)?.user ?? state.value.conversations.find(c => c.user.id === id)?.user
      const forum = forumUsers.value.find(u => u.id === id)
      if (member) state.value.profiles[id] = { ...member }
      else if (forum) state.value.profiles[id] = { ...forum, relationship: 'none', canMessage: s.mode === 'legacy' }
      else state.value.errors[`profile:${id}`] = '暂时无法获取这位成员的资料，请从好友或社区成员入口重新打开。'
    }
    if (!valid(ticket)) return
    const profile = state.value.profiles[id]
    if (s.capabilities.metadata && profile?.relationship === 'friends') await read(`metadata:${id}`, () => s.getFriendMetadata(id), metadata => { state.value.friendRecords[id] = { user: profile, createdAt: state.value.friendRecords[id]?.createdAt ?? '', metadata } })
  }
  async function run(key: string, action: (s: SocialService) => Promise<unknown>, notice = '已保存') {
    if (state.value.busy[key]) return false
    const s = service(), ticket = session(); state.value.busy[key] = true; state.value.errors[key] = ''; state.value.notice = ''
    try {
      const result = await action(s); if (!valid(ticket)) return false
      if (key.startsWith('member:') && result && typeof result === 'object' && 'starred' in result && 'note' in result && 'groupId' in result) {
        const record = state.value.friendRecords[Number(key.split(':')[1])]
        if (record) record.metadata = result as NonNullable<Friendship['metadata']>
      }
      state.value.notice = notice
      await Promise.all([refresh(), loadConversations()])
      return valid(ticket)
    } catch (e) { if (valid(ticket)) { state.value.errors[key] = apiErrorMessage(e); if ([404, 409].includes((e as { status?: number }).status ?? 0)) await refresh() }; return false }
    finally { if (valid(ticket)) state.value.busy[key] = false }
  }
  function loadConversations(append = false) {
    const s = service()
    return read('conversations', async () => s.capabilities.conversations ? s.listConversations(append ? state.value.conversationsCursor ?? undefined : undefined) : { items: summarizeMessages(await s.listMessages(), auth.user.value?.id ?? 0), nextCursor: null }, page => {
      if (!s.capabilities.conversations) for (const conversation of page.items) {
        conversation.user = state.value.friendRecords[conversation.user.id]?.user ?? { ...conversation.user, relationship: 'none', canMessage: s.mode === 'legacy' }
      }
      state.value.conversations = append ? [...new Map([...state.value.conversations, ...page.items].map(c => [c.user.id, c])).values()] : page.items
      state.value.conversationsCursor = page.nextCursor; remember(page.items.map(c => c.user))
    })
  }
  function loadHistory(id: number, append = false) {
    const s = service()
    return read(`history:${id}`, async () => s.capabilities.conversations ? s.listHistory(id, append ? state.value.histories[id]?.cursor ?? undefined : undefined) : { items: (await s.listMessages()).filter(m => m.sender.id === id || m.recipient.id === id), nextCursor: null }, page => {
      state.value.messages = mergeMessages(state.value.messages, page.items)
      state.value.histories[id] = { loaded: true, cursor: page.nextCursor }
      for (const m of page.items as WorkspaceMessage[]) if (m.clientMessageId) state.value.outbox = state.value.outbox.filter(p => p.clientMessageId !== m.clientMessageId)
    })
  }
  async function send(id: number, content: string, retryId?: string) {
    if (!content.trim()) return
    const s = service(), ticket = session()
    let pending = retryId ? state.value.outbox.find(p => p.clientMessageId === retryId) : undefined
    if (pending?.status === 'sending') return
    if (!pending) { pending = { recipientId: id, content, clientMessageId: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'sending' }; state.value.outbox.push(pending) }
    const clientId = pending.clientMessageId
    pending.status = 'sending'; pending.error = ''
    try {
      const message = await s.sendMessage(id, content, clientId)
      if (!valid(ticket)) return
      state.value.outbox = state.value.outbox.filter(p => p.clientMessageId !== clientId)
      state.value.messages = mergeMessages(state.value.messages, [message])
      await loadConversations()
    } catch (e) { if (valid(ticket)) { const item = state.value.outbox.find(p => p.clientMessageId === clientId); if (item) { item.status = 'failed'; item.error = apiErrorMessage(e) } } }
  }
  async function markRead(id: number) {
    const s = service(), ticket = session()
    const key = `read:${id}`, seen = state.value.messages.filter(m => m.sender.id === id && m.recipient.id === ticket.owner && !m.isRead)
    if (!seen.length || state.value.busy[key]) return
    const ids = new Set(seen.map(m => m.id)); state.value.busy[key] = true; state.value.errors[key] = ''
    try { await s.markConversationRead(id, Math.max(...ids)); if (!valid(ticket)) return
      for (const m of state.value.messages) if (ids.has(m.id)) m.isRead = true
      const conversation = state.value.conversations.find(c => c.user.id === id); if (conversation) conversation.unread = Math.max(0, conversation.unread - ids.size)
    } catch (e) { if (valid(ticket)) state.value.errors[key] = apiErrorMessage(e) }
    finally { if (valid(ticket)) state.value.busy[key] = false }
  }
  if (import.meta.client && !rt.scope) {
    rt.scope = effectScope(true)
    rt.scope.run(() => {
      watch(() => auth.user.value?.id ?? null, owner => { rt.owner = owner; rt.generation++; rt.serial = {}; state.value = initial(); if (owner) { void refresh(); void loadConversations() } }, { flush: 'sync' })
      for (const event of ['friend_request_received', 'friend_request_updated', 'friendship_changed', 'friend_metadata_changed', 'friend_group_changed'] as const) ws.on(event, () => { void refresh() })
      for (const event of ['presence_snapshot', 'presence_changed'] as const) ws.on(event, () => { void loadPresence() })
      for (const event of ['new_message', 'conversation_changed', 'conversation_read'] as const) ws.on(event, () => { void loadConversations(); for (const id of Object.keys(state.value.histories)) void loadHistory(Number(id)) })
      watch(ws.status, (value, previous) => { if (value !== 'connected') state.value.presence = {}; else if (previous !== value) { void refresh(); void loadConversations(); for (const id of Object.keys(state.value.histories)) void loadHistory(Number(id)) } })
    })
  }
  const unread = computed(() => state.value.conversations.reduce((sum, c) => sum + c.unread, 0))
  return { state, api, unread, refresh, loadFriends, loadRequests, loadSettings, loadProfile, loadConversations, loadHistory, run, send, markRead }
}
