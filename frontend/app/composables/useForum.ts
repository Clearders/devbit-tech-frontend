import type {
  CreatePostPayload,
  ForumCategory,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser
} from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'
import { useForumApi } from './useForumApi'

export type { ForumCategory, ForumComment, ForumMessage, ForumPost, ForumUser }
export { FORUM_CATEGORIES }

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
  const messages = useState<ForumMessage[]>('forum_messages', () => [])
  const users = useState<ForumUser[]>('forum_users', () => [])
  const initialized = useState<boolean>('forum_initialized', () => false)
  const initPromise = useState<Promise<void> | null>('forum_init_promise', () => null)
  const apiReachable = useState<boolean>('forum_api_reachable', () => true)

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
      messages.value = bootstrap.messages
      apiReachable.value = true
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

  const initFromApi = async () => {
    await ensureInit()
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
    DEMO_USERS: users,
    FORUM_CATEGORIES,
    formatRelativeTime,
    apiReachable,
    initFromApi,
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
    localSearchPosts
  }
}
