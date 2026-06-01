import type {
  CreatePostPayload,
  ForumCategory,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser,
  FriendInfo
} from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'
import { useForumApi } from './useForumApi'

export type { ForumCategory, ForumComment, ForumMessage, ForumPost, ForumUser, FriendInfo }
export { FORUM_CATEGORIES }

// ---------- localStorage helpers for message persistence ----------
const MESSAGES_STORAGE_KEY = 'devbit_messages'

function loadMessagesFromStorage(): ForumMessage[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as ForumMessage[]
    return []
  } catch {
    return []
  }
}

function saveMessagesToStorage(messages: ForumMessage[]) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-US')
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
  const { user, isAuthenticated, syncCurrentUser } = useAuth()
  const api = useForumApi()

  const posts = useState<ForumPost[]>('forum_posts', () => [])
  const comments = useState<ForumComment[]>('forum_comments', () => [])
  // Initialize messages from localStorage first for instant display
  const messages = useState<ForumMessage[]>('forum_messages', () => loadMessagesFromStorage())
  const users = useState<ForumUser[]>('forum_users', () => [])
  const friends = useState<FriendInfo[]>('forum_friends', () => [])
  const initialized = useState<boolean>('forum_initialized', () => false)
  const initPromise = ref<Promise<void> | null>(null)
  const apiReachable = useState<boolean>('forum_api_reachable', () => true)
  const refreshWatcherBound = useState<boolean>('forum_auth_refresh_watcher_bound', () => false)
  const messagesPersistWatcherBound = useState<boolean>('forum_messages_persist_bound', () => false)
  const authKey = computed(() => isAuthenticated.value ? `user:${user.value?.id ?? 'pending'}` : 'anonymous')

  // Global ui state for message panel
  const isMessagePanelOpen = useState<boolean>('forum_msg_panel_open', () => false)
  const activeMessagePartner = useState<number | null>('forum_msg_active_partner', () => null)
  const messagePanelTab = useState<'messages' | 'friends' | 'addFriend'>('forum_msg_panel_tab', () => 'messages')

  // Persist messages to localStorage whenever they change (client only)
  if (import.meta.client && !messagesPersistWatcherBound.value) {
    messagesPersistWatcherBound.value = true
    watch(messages, (newMessages) => {
      saveMessagesToStorage(newMessages)
    }, { deep: true })
  }

  const openMessagePanel = (partnerId?: number) => {
    isMessagePanelOpen.value = true
    if (partnerId) {
      activeMessagePartner.value = partnerId
      markConversationAsRead(partnerId).catch(() => {})
    }
  }

  const ensureInit = async (force = false) => {
    if (force) {
      initialized.value = false
      initPromise.value = null
    }
    if (initialized.value && !force) {
      return
    }
    if (initPromise.value) {
      return initPromise.value
    }

    initPromise.value = (async () => {
      if (isAuthenticated.value && !user.value) {
        await syncCurrentUser()
      }
      const bootstrap = await api.fetchBootstrap()
      users.value = bootstrap.users
      posts.value = sortPosts(bootstrap.posts)
      comments.value = bootstrap.comments
      // Merge API messages with locally persisted ones (API wins for same id)
      messages.value = bootstrap.messages
      apiReachable.value = true
      // Fetch friends
      try {
        friends.value = await api.fetchFriends()
      } catch {
        // friends list non-critical
      }
      initialized.value = true
    })()
      .catch((error) => {
        apiReachable.value = false
        throw error
      })
      .finally(() => {
        initPromise.value = null
      })

    return initPromise.value
  }

  if (import.meta.client && !refreshWatcherBound.value) {
    refreshWatcherBound.value = true
    watch(authKey, (_next, previous) => {
      if (previous === undefined) return
      void ensureInit(true).catch(() => {
        apiReachable.value = false
      })
    })
  }

  const refreshUsers = async () => {
    users.value = await api.fetchUsers()
  }

  const loadPost = async (postId: number) => {
    const post = await api.fetchPost(postId)
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
    const post = await api.createPost(data)
    posts.value = sortPosts([post, ...posts.value.filter((item) => item.id !== post.id)])
    if (!users.value.some((entry) => entry.id === post.author.id)) {
      await refreshUsers()
    }
    return post
  }

  const addComment = async (postId: number, content: string) => {
    const comment = await api.createComment(postId, content)
    comments.value = [...comments.value, comment]
    const post = posts.value.find((entry) => entry.id === postId)
    if (post) {
      post.commentCount += 1
    }
    return comment
  }

  const deletePost = async (postId: number) => {
    await api.deletePost(postId)
    posts.value = posts.value.filter((post) => post.id !== postId)
    comments.value = comments.value.filter((comment) => comment.postId !== postId)
  }

  const deleteComment = async (commentId: number) => {
    await api.deleteComment(commentId)
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
    updatePost(await api.togglePin(postId))
  }

  const toggleLockPost = async (postId: number) => {
    updatePost(await api.toggleLock(postId))
  }

  const toggleLikePost = async (postId: number) => {
    updatePost(await api.toggleLike(postId))
  }

  const sendMessage = async (recipientId: number, content: string) => {
    const message = await api.sendMessage({ recipientId, content })
    messages.value = [...messages.value, message]
    return message
  }

  const markAsRead = async (messageId: number) => {
    await api.markMessageRead(messageId)
    const message = messages.value.find((item) => item.id === messageId)
    if (message) {
      message.isRead = true
    }
  }

  const markConversationAsRead = async (partnerId: number) => {
    await api.markConversationRead(partnerId)
    const currentUserId = user.value?.id ?? 0
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
    const info = await api.addFriend({ friendId })
    if (!friends.value.some((f) => f.user.id === friendId)) {
      friends.value = [...friends.value, info]
    }
    return info
  }

  const removeFriend = async (friendId: number) => {
    await api.removeFriend(friendId)
    friends.value = friends.value.filter((f) => f.user.id !== friendId)
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
    FORUM_CATEGORIES,
    formatRelativeTime,
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
