import type {
  CreatePostPayload,
  ForumCategory,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser,
  FriendInfo
} from '~~/shared/forum'
import type { EffectScope } from 'vue'
import { useForumApi } from './useForumApi'

// ---------- legacy localStorage cleanup ----------
const MESSAGES_STORAGE_PREFIX = 'devbit_messages'

interface ForumRuntime {
  initPromise: Promise<void> | null
  initUserId: number | null | undefined
  bindingsReady: boolean
  sessionGeneration: number
  scope: EffectScope | null
}

// Nuxt apps are request-scoped during SSR and singleton-scoped in the browser.
// Runtime-only coordination belongs here rather than in serializable useState.
const forumRuntimes = new WeakMap<object, ForumRuntime>()

function getForumRuntime(nuxtApp: object): ForumRuntime {
  const existing = forumRuntimes.get(nuxtApp)
  if (existing) return existing

  const runtime: ForumRuntime = {
    initPromise: null,
    initUserId: undefined,
    bindingsReady: false,
    sessionGeneration: 0,
    scope: null,
  }
  forumRuntimes.set(nuxtApp, runtime)
  return runtime
}

function replacePost(posts: ForumPost[], post: ForumPost) {
  const index = posts.findIndex((item) => item.id === post.id)
  if (index === -1) {
    return [post, ...posts]
  }
  const next = [...posts]
  next[index] = post
  return next
}

function sortPosts(posts: ForumPost[]) {
  return [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export const useForum = () => {
  const nuxtApp = useNuxtApp()
  const runtime = getForumRuntime(nuxtApp)
  const { user } = useAuth()
  const api = useForumApi()

  const posts = useState<ForumPost[]>('forum_posts', () => [])
  const comments = useState<ForumComment[]>('forum_comments', () => [])
  const messages = useState<ForumMessage[]>('forum_messages', () => [])
  const users = useState<ForumUser[]>('forum_users', () => [])
  const friends = useState<FriendInfo[]>('forum_friends', () => [])
  const initialized = useState<boolean>('forum_initialized', () => false)
  const initializedUserId = useState<number | null>('forum_initialized_user_id', () => null)
  const apiReachable = useState<boolean>('forum_api_reachable', () => true)
  const authenticatedUserId = computed(() => user.value?.id ?? null)

  // Global ui state for message panel
  const isMessagePanelOpen = useState<boolean>('forum_msg_panel_open', () => false)
  const activeMessagePartner = useState<number | null>('forum_msg_active_partner', () => null)
  const messagePanelTab = useState<'messages' | 'friends' | 'addFriend'>('forum_msg_panel_tab', () => 'messages')

  const switchMessageAccount = (preserveCurrent = false) => {
    runtime.sessionGeneration += 1
    const currentMessages = preserveCurrent ? messages.value : []
    const currentFriends = preserveCurrent ? friends.value : []

    messages.value = currentMessages
    friends.value = currentFriends
    isMessagePanelOpen.value = false
    activeMessagePartner.value = null
    messagePanelTab.value = 'messages'

  }

  const captureSession = () => ({
    userId: authenticatedUserId.value,
    generation: runtime.sessionGeneration,
  })

  const isCurrentSession = (session: ReturnType<typeof captureSession>) =>
    session.userId === authenticatedUserId.value
    && session.generation === runtime.sessionGeneration

  // ── WebSocket real-time message integration ───────────────────────────────
  const openMessagePanel = (partnerId?: number) => {
    isMessagePanelOpen.value = true
    if (partnerId) {
      activeMessagePartner.value = partnerId
      markConversationAsRead(partnerId).catch(() => {})
    }
  }

  const ensureInit = (force = false): Promise<void> => {
    const requestedUserId = authenticatedUserId.value
    const activeRequest = runtime.initPromise

    if (activeRequest) {
      if (runtime.initUserId === requestedUserId) return activeRequest
      return activeRequest.catch(() => undefined).then(() => ensureInit(true))
    }
    if (initialized.value && initializedUserId.value === requestedUserId && !force) {
      return Promise.resolve()
    }

    if (force || initializedUserId.value !== requestedUserId) initialized.value = false
    runtime.initUserId = requestedUserId
    const requestGeneration = runtime.sessionGeneration

    const request = (async () => {
      const bootstrap = await api.fetchBootstrap()

      let fetchedFriends: FriendInfo[] | null = null
      try {
        fetchedFriends = await api.fetchFriends()
      } catch {
        // The friends list is non-critical and may be unavailable anonymously.
      }

      // Bootstrap posts contain viewer-specific fields such as likedByMe, so
      // no part of a response may cross an account/session boundary.
      if (
        authenticatedUserId.value !== requestedUserId
        || runtime.sessionGeneration !== requestGeneration
      ) return

      users.value = bootstrap.users
      posts.value = sortPosts(bootstrap.posts)
      comments.value = bootstrap.comments
      messages.value = bootstrap.messages
      if (fetchedFriends) friends.value = fetchedFriends
      initializedUserId.value = requestedUserId
      initialized.value = true
      apiReachable.value = true
    })().catch((error) => {
      apiReachable.value = false
      throw error
    })

    runtime.initPromise = request
    const clearRequest = () => {
      if (runtime.initPromise === request) {
        runtime.initPromise = null
        runtime.initUserId = undefined
      }
    }
    void request.then(clearRequest, clearRequest)
    return request
  }

  if (import.meta.client && !runtime.bindingsReady) {
    runtime.bindingsReady = true
    runtime.scope = effectScope(true)
    runtime.scope.run(() => {
      // Private messages are server-owned. Remove caches written by older
      // versions instead of treating predictable localStorage keys as isolation.
      try {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index)
          if (key === MESSAGES_STORAGE_PREFIX || key?.startsWith(`${MESSAGES_STORAGE_PREFIX}:`)) {
            localStorage.removeItem(key)
          }
        }
      } catch {
        // Storage may be disabled by browser privacy settings.
      }
      const preserveHydratedState = initialized.value
        && initializedUserId.value === authenticatedUserId.value
      switchMessageAccount(preserveHydratedState)

      const { on: wsOn } = useWebSocket()
      wsOn('new_message', (message) => {
        if (messages.value.some(item => item.id === message.message_id)) return

        const receivingUserId = authenticatedUserId.value
        void api.fetchBootstrap().then((bootstrap) => {
          if (authenticatedUserId.value === receivingUserId) {
            messages.value = bootstrap.messages
          }
        }).catch(() => {
          // A later bootstrap will reconcile the message list.
        })
      })

      watch(authenticatedUserId, () => {
        switchMessageAccount()
        void ensureInit(true).catch(() => {
          apiReachable.value = false
        })
      })
    })
  }

  const refreshUsers = async () => {
    users.value = await api.fetchUsers()
  }

  const loadPost = async (postId: number) => {
    const session = captureSession()
    const post = await api.fetchPost(postId)
    if (!isCurrentSession(session)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Authentication changed while loading the post.'
      })
    }
    posts.value = sortPosts(replacePost(posts.value, post))
    return post
  }

  const loadCommentsForPost = async (postId: number) => {
    const postComments = await api.fetchComments(postId)
    comments.value = [
      ...comments.value.filter((comment) => comment.postId !== postId),
      ...postComments
    ]
    apiReachable.value = true
    return postComments
  }

  const getPostsByCategory = (category?: ForumCategory | 'all') => {
    const list =
      category && category !== 'all'
        ? posts.value.filter((post) => post.category === category)
        : posts.value
    return sortPosts(list)
  }

  const getPostById = (id: number) => posts.value.find((post) => post.id === id) ?? null

  const getCommentsByPostId = (postId: number) =>
    comments.value
      .filter((comment) => comment.postId === postId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

  const getUnreadMessageCount = () =>
    messages.value.filter(
      (message) => !message.isRead && message.recipient.id === (user.value?.id ?? 0)
    ).length

  const getConversations = () => {
    const currentUserId = user.value?.id ?? 0
    const userMessages = messages.value.filter(
      (message) =>
        message.sender.id === currentUserId || message.recipient.id === currentUserId
    )
    const conversationMap = new Map<number, ForumMessage[]>()

    for (const message of userMessages) {
      const partnerId =
        message.sender.id === currentUserId
          ? message.recipient.id
          : message.sender.id
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, [])
      }
      conversationMap.get(partnerId)!.push(message)
    }

    return Array.from(conversationMap.values()).map((conversation) => {
      const ordered = [...conversation].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const lastMessage = ordered[0]!
      const partner =
        lastMessage.sender.id === currentUserId
          ? lastMessage.recipient
          : lastMessage.sender
      return {
        partner,
        messages: ordered,
        lastMessage,
        unread: ordered.filter(
          (message) =>
            !message.isRead && message.recipient.id === currentUserId
        ).length
      }
    })
  }

  const createPost = async (data: CreatePostPayload) => {
    const session = captureSession()
    const post = await api.createPost(data)
    if (!isCurrentSession(session)) return post
    posts.value = sortPosts([post, ...posts.value.filter((item) => item.id !== post.id)])
    if (!users.value.some((entry) => entry.id === post.author.id)) {
      await refreshUsers()
    }
    return post
  }

  const addComment = async (postId: number, content: string) => {
    const session = captureSession()
    const comment = await api.createComment(postId, content)
    if (!isCurrentSession(session)) return comment
    comments.value = [...comments.value, comment]
    const post = posts.value.find((entry) => entry.id === postId)
    if (post) {
      post.commentCount += 1
    }
    return comment
  }

  const deletePost = async (postId: number) => {
    const session = captureSession()
    await api.deletePost(postId)
    if (!isCurrentSession(session)) return
    posts.value = posts.value.filter((post) => post.id !== postId)
    comments.value = comments.value.filter((comment) => comment.postId !== postId)
  }

  const fetchMyPosts = async () => {
    const session = captureSession()
    const ownPosts = await api.fetchMyPosts()
    if (!isCurrentSession(session)) return []
    return ownPosts
  }

  const modifyPost = async (postId: number, content: string) => {
    const session = captureSession()
    await api.modifyPost(postId, content)
    if (!isCurrentSession(session)) return
    // Update local post state
    const post = posts.value.find((p) => p.id === postId)
    if (post) {
      post.content = content
      post.updatedAt = new Date().toISOString()
    }
  }

  const deleteComment = async (commentId: number) => {
    const session = captureSession()
    await api.deleteComment(commentId)
    if (!isCurrentSession(session)) return
    const comment = comments.value.find((item) => item.id === commentId)
    comments.value = comments.value.filter((item) => item.id !== commentId)
    if (comment) {
      const post = posts.value.find((entry) => entry.id === comment.postId)
      if (post) {
        post.commentCount = Math.max(0, post.commentCount - 1)
      }
    }
  }

  const updatePost = (updated: ForumPost) => {
    posts.value = sortPosts(replacePost(posts.value, updated))
  }

  const togglePinPost = async (postId: number) => {
    const session = captureSession()
    const updated = await api.togglePin(postId)
    if (!isCurrentSession(session)) return
    const current = posts.value.find((post) => post.id === postId)
    if (current) {
      current.isPinned = updated.isPinned
      posts.value = sortPosts(posts.value)
    }
  }

  const toggleLockPost = async (postId: number) => {
    const session = captureSession()
    const updated = await api.toggleLock(postId)
    if (!isCurrentSession(session)) return
    const current = posts.value.find((post) => post.id === postId)
    if (current) current.isLocked = updated.isLocked
  }

  const toggleLikePost = async (postId: number) => {
    const session = captureSession()
    const updated = await api.toggleLike(postId)
    if (isCurrentSession(session)) updatePost(updated)
  }

  const sendMessage = async (recipientId: number, content: string) => {
    const session = captureSession()
    const message = await api.sendMessage({ recipientId, content })
    if (isCurrentSession(session)) messages.value = [...messages.value, message]
    return message
  }

  const markAsRead = async (messageId: number) => {
    const session = captureSession()
    await api.markMessageRead(messageId)
    if (!isCurrentSession(session)) return
    const message = messages.value.find((item) => item.id === messageId)
    if (message) {
      message.isRead = true
    }
  }

  const markConversationAsRead = async (partnerId: number) => {
    const session = captureSession()
    await api.markConversationRead(partnerId)
    if (!isCurrentSession(session)) return
    const currentUserId = session.userId ?? 0
    messages.value.forEach((message) => {
      if (message.sender.id === partnerId && message.recipient.id === currentUserId) {
        message.isRead = true
      }
    })
  }

  // ---------- Friends ----------

  const getFriends = () => friends.value

  const isFriend = (userId: number) => friends.value.some((f) => f.user.id === userId)

  const addFriend = async (friendId: number) => {
    const session = captureSession()
    const info = await api.addFriend({ friendId })
    if (isCurrentSession(session) && !friends.value.some((f) => f.user.id === friendId)) {
      friends.value = [...friends.value, info]
    }
    return info
  }

  const removeFriend = async (friendId: number) => {
    const session = captureSession()
    await api.removeFriend(friendId)
    if (isCurrentSession(session)) {
      friends.value = friends.value.filter((f) => f.user.id !== friendId)
    }
  }

  const searchUsers = async (query: string) => {
    return api.searchUsers(query)
  }

  // ---------- Search ----------

  const searchPosts = async (query: string) => {
    const q = query.trim()
    if (!q) {
      return getPostsByCategory()
    }
    return api.searchPosts(q)
  }

  const localSearchPosts = (query: string) => {
    const q = query.toLowerCase().trim()
    if (!q) {
      return getPostsByCategory()
    }
    return posts.value.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  }

  return {
    posts,
    comments,
    messages,
    users,
    apiReachable,
    ensureInit,
    loadPost,
    loadCommentsForPost,
    getPostsByCategory,
    getPostById,
    getCommentsByPostId,
    getUnreadMessageCount,
    getConversations,
    createPost,
    addComment,
    deletePost,
    deleteComment,
    fetchMyPosts,
    modifyPost,
    togglePinPost,
    toggleLockPost,
    toggleLikePost,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    searchPosts,
    localSearchPosts,
    getFriends,
    isFriend,
    addFriend,
    removeFriend,
    searchUsers,
    friends,
    isMessagePanelOpen,
    activeMessagePartner,
    messagePanelTab,
    openMessagePanel
  }
}
