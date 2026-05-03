import { useForumApi } from './useForumApi'

export interface ForumUser {
  id: number
  name: string
  avatar: string
  isAdmin: boolean
}

export interface ForumComment {
  id: number
  postId: number
  author: ForumUser
  content: string
  createdAt: string
}

export interface ForumPost {
  id: number
  title: string
  content: string
  author: ForumUser
  category: ForumCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  viewCount: number
  commentCount: number
  isPinned: boolean
  isLocked: boolean
}

export interface ForumMessage {
  id: number
  sender: ForumUser
  recipient: ForumUser
  content: string
  createdAt: string
  isRead: boolean
}

export type ForumCategory = 'general' | 'tech' | 'devbit' | 'help' | 'showcase' | 'announcement'

export const FORUM_CATEGORIES: { value: ForumCategory; label: string; icon: string; desc: string }[] = [
  { value: 'general', label: '综合讨论', icon: '💬', desc: '自由交流，分享你的任何想法' },
  { value: 'tech', label: '技术探讨', icon: '🛠️', desc: '深入技术话题，学习与成长' },
  { value: 'devbit', label: 'DevBit专区', icon: '🚀', desc: '关于DevBit Tech的一切' },
  { value: 'help', label: '求助问答', icon: '❓', desc: '遇到问题？社区来帮你' },
  { value: 'showcase', label: '作品展示', icon: '🎨', desc: '展示你的项目与创意' },
  { value: 'announcement', label: '公告通知', icon: '📢', desc: '社区重要公告与更新' },
]

const DEMO_USERS: ForumUser[] = [
  { id: 1, name: 'Clearders', avatar: '👨‍💻', isAdmin: true },
  { id: 2, name: 'EpsilonHunter', avatar: '🧑‍🎨', isAdmin: true },
  { id: 3, name: 'CodeMaster', avatar: '🦊', isAdmin: false },
  { id: 4, name: 'DebugQueen', avatar: '🐱', isAdmin: false },
  { id: 5, name: 'PixelArtist', avatar: '🎨', isAdmin: false },
  { id: 6, name: 'StackOverflow', avatar: '🤖', isAdmin: false },
]

function generateMockPosts(): ForumPost[] {
  const now = Date.now()
  const day = 86400000
  return [
    {
      id: 1,
      title: '欢迎来到 DevBit Tech 论坛！🎉',
      content: '大家好！欢迎来到 DevBit Tech 官方社区论坛。\n\n这里是技术爱好者交流的平台，你可以：\n- 分享你的技术心得\n- 提问求助\n- 展示你的作品\n- 参与社区讨论\n\n请遵守社区规范，友善交流。让我们一起打造一个充满活力的技术社区！',
      author: DEMO_USERS[0],
      category: 'announcement',
      tags: ['公告', '社区'],
      createdAt: new Date(now - day * 7).toISOString(),
      updatedAt: new Date(now - day * 7).toISOString(),
      viewCount: 1024,
      commentCount: 3,
      isPinned: true,
      isLocked: false,
    },
    {
      id: 2,
      title: 'Rust vs Go：后端开发语言选择指南',
      content: '最近在选型后端技术栈，纠结于 Rust 和 Go 之间。\n\nRust 优势：零成本抽象、内存安全、强大的类型系统\nGo 优势：简洁语法、出色的并发模型、快速编译\n\n大家在实际项目中有使用经验吗？欢迎分享！',
      author: DEMO_USERS[2],
      category: 'tech',
      tags: ['Rust', 'Go', '后端'],
      createdAt: new Date(now - day * 3).toISOString(),
      updatedAt: new Date(now - day * 2).toISOString(),
      viewCount: 567,
      commentCount: 5,
      isPinned: false,
      isLocked: false,
    },
    {
      id: 3,
      title: 'DevBit Tech 前端使用 Nuxt 4——最佳实践分享',
      content: 'DevBit Tech 的前端基于 Nuxt 4 + Vue 3 构建。\n\n分享几个我们项目中的最佳实践：\n1. 使用 composables 管理状态\n2. 合理利用 middleware 做路由守卫\n3. CSS 自定义属性保证风格一致性\n\n欢迎补充更多建议！',
      author: DEMO_USERS[1],
      category: 'devbit',
      tags: ['Nuxt', 'Vue', '前端', 'DevBit'],
      createdAt: new Date(now - day * 2).toISOString(),
      updatedAt: new Date(now - day).toISOString(),
      viewCount: 389,
      commentCount: 4,
      isPinned: true,
      isLocked: false,
    },
    {
      id: 4,
      title: '求助：PostgreSQL 性能优化建议',
      content: '我们项目使用 PostgreSQL，最近数据量上来了查询变慢。\n\n表结构大致是用户表和日志表关联查询。\n\n已经做了：\n- 添加了基本索引\n- 调整了 shared_buffers\n\n还有什么优化方向可以尝试？',
      author: DEMO_USERS[3],
      category: 'help',
      tags: ['PostgreSQL', '数据库', '性能优化'],
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString(),
      viewCount: 234,
      commentCount: 3,
      isPinned: false,
      isLocked: false,
    },
    {
      id: 5,
      title: '我开发了一个开源Markdown编辑器',
      content: '最近利用业余时间开发了一个轻量级的Markdown编辑器，支持实时预览、代码高亮和主题切换。\n\n技术栈：Vue 3 + CodeMirror 6 + Tailwind CSS\n\nGitHub: https://github.com/example/markdown-editor\n\n欢迎大家试用和提意见！',
      author: DEMO_USERS[4],
      category: 'showcase',
      tags: ['开源', 'Markdown', 'Vue', '项目展示'],
      createdAt: new Date(now - day * 5).toISOString(),
      updatedAt: new Date(now - day * 4).toISOString(),
      viewCount: 456,
      commentCount: 6,
      isPinned: false,
      isLocked: false,
    },
    {
      id: 6,
      title: '游戏开发入门：从零到发布',
      content: '想分享一下游戏开发的心路历程。\n\n从最初选择引擎（Unity vs Godot），到第一个 prototype，再到最后的发布，踩了很多坑也学到了很多。\n\n大家如果对游戏开发感兴趣，可以一起讨论！',
      author: DEMO_USERS[5],
      category: 'general',
      tags: ['游戏开发', '入门', '经验分享'],
      createdAt: new Date(now - day * 10).toISOString(),
      updatedAt: new Date(now - day * 8).toISOString(),
      viewCount: 678,
      commentCount: 4,
      isPinned: false,
      isLocked: false,
    },
  ]
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// Track whether the API backend is reachable
const apiReachable = ref<boolean | null>(null)

export const useForum = () => {
  // --- Client-side state (will be replaced by API calls) ---
  const posts = useState<ForumPost[]>('forum_posts', () => generateMockPosts())
  const comments = useState<ForumComment[]>('forum_comments', () => [
    { id: 1, postId: 1, author: DEMO_USERS[2], content: '期待已久！终于有论坛了 🎉', createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
    { id: 2, postId: 1, author: DEMO_USERS[3], content: '支持！希望社区越来越好', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 3, postId: 1, author: DEMO_USERS[0], content: '感谢大家支持，我们会持续改进！', createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 4, postId: 2, author: DEMO_USERS[1], content: '个人推荐 Rust——虽然学习曲线陡峭，但长期收益很高', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 5, postId: 2, author: DEMO_USERS[4], content: 'Go 更适合快速开发，看你的项目需求', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 6, postId: 3, author: DEMO_USERS[3], content: 'Nuxt 4 的 DX 体验确实比 3 好很多', createdAt: new Date().toISOString() },
    { id: 7, postId: 4, author: DEMO_USERS[2], content: '试试 EXPLAIN ANALYZE 看看查询计划', createdAt: new Date(Date.now() - 36000000).toISOString() },
    { id: 8, postId: 5, author: DEMO_USERS[5], content: '很棒的项目！star 了 ⭐', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  ])
  const messages = useState<ForumMessage[]>('forum_messages', () => [
    { id: 1, sender: DEMO_USERS[0], recipient: DEMO_USERS[2], content: '你好！欢迎来到社区，有任何问题随时问我。', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), isRead: true },
    { id: 2, sender: DEMO_USERS[2], recipient: DEMO_USERS[0], content: '谢谢！论坛功能很强大 👍', createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), isRead: true },
    { id: 3, sender: DEMO_USERS[0], recipient: DEMO_USERS[0], content: '系统通知：欢迎来到DevBit论坛', createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), isRead: true },
    { id: 4, sender: DEMO_USERS[3], recipient: DEMO_USERS[0], content: '请问可以帮我看看我的帖子吗？', createdAt: new Date(Date.now() - 7200000).toISOString(), isRead: false },
    { id: 5, sender: DEMO_USERS[1], recipient: DEMO_USERS[2], content: '你的技术文章写得很棒！', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
  ])

  // Lazy-load API
  let _api: ReturnType<typeof useForumApi> | null = null
  const getApi = () => {
    if (!_api) _api = useForumApi()
    return _api
  }

  // Try to initialize from API backend
  const initFromApi = async () => {
    if (apiReachable.value === false) return // already know API is down
    try {
      const api = getApi()
      const [apiPosts, apiComments, apiMessages] = await Promise.all([
        api.fetchPosts(),
        api.fetchComments(0).then(() => []), // fetchComments requires postId; we'll lazy-load
        api.fetchMessages(),
      ])
      if (apiPosts.length > 0) {
        posts.value = apiPosts
      }
      if (apiMessages.length > 0) {
        messages.value = apiMessages
      }
      apiReachable.value = true
    } catch {
      apiReachable.value = false
      // Keep mock data as fallback
    }
  }

  // --- Getters ---
  const getPostsByCategory = (category?: ForumCategory | 'all') => {
    let list = [...posts.value]
    if (category && category !== 'all') {
      list = list.filter(p => p.category === category)
    }
    // Sort: pinned first, then by date
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return list
  }

  const getPostById = (id: number) => posts.value.find(p => p.id === id) ?? null

  const getCommentsByPostId = (postId: number) =>
    comments.value.filter(c => c.postId === postId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

  const getUnreadMessageCount = () => messages.value.filter(m => !m.isRead).length

  const getConversations = () => {
    const { user } = useAuth()
    const currentUserId = user.value?.id ?? 0
    const userMessages = messages.value.filter(
      m => m.sender.id === currentUserId || m.recipient.id === currentUserId
    )
    const conversationMap = new Map<number, ForumMessage[]>()
    for (const msg of userMessages) {
      const partnerId = msg.sender.id === currentUserId ? msg.recipient.id : msg.sender.id
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, [])
      }
      conversationMap.get(partnerId)!.push(msg)
    }
    return Array.from(conversationMap.entries()).map(([partnerId, msgs]) => {
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const partner = msgs[0].sender.id === currentUserId ? msgs[0].recipient : msgs[0].sender
      return { partner, messages: msgs, lastMessage: msgs[0], unread: msgs.filter(m => !m.isRead && m.recipient.id === currentUserId).length }
    })
  }

  // --- Actions ---
  const createPost = async (data: { title: string; content: string; category: ForumCategory; tags: string[] }) => {
    const { user } = useAuth()
    // Try API first
    if (apiReachable.value !== false) {
      try {
        const result = await getApi().createPost(data)
        posts.value = [result, ...posts.value]
        apiReachable.value = true
        return result
      } catch { apiReachable.value = false }
    }
    // Fallback to mock
    const forumUser: ForumUser = {
      id: user.value?.id ?? 0,
      name: user.value?.name ?? 'Anonymous',
      avatar: '👤',
      isAdmin: false,
    }
    const newPost: ForumPost = {
      id: Math.max(0, ...posts.value.map(p => p.id)) + 1,
      title: data.title,
      content: data.content,
      author: forumUser,
      category: data.category,
      tags: data.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
    }
    posts.value = [newPost, ...posts.value]
    return newPost
  }

  const addComment = async (postId: number, content: string) => {
    // Try API first
    if (apiReachable.value !== false) {
      try {
        const result = await getApi().createComment(postId, content)
        comments.value = [...comments.value, result]
        const post = posts.value.find(p => p.id === postId)
        if (post) {
          post.commentCount = comments.value.filter(c => c.postId === postId).length
        }
        apiReachable.value = true
        return result
      } catch { apiReachable.value = false }
    }
    // Fallback to mock
    const { user } = useAuth()
    const forumUser: ForumUser = {
      id: user.value?.id ?? 0,
      name: user.value?.name ?? 'Anonymous',
      avatar: '👤',
      isAdmin: false,
    }
    const newComment: ForumComment = {
      id: Math.max(0, ...comments.value.map(c => c.id)) + 1,
      postId,
      author: forumUser,
      content,
      createdAt: new Date().toISOString(),
    }
    comments.value = [...comments.value, newComment]
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.commentCount = comments.value.filter(c => c.postId === postId).length
    }
    return newComment
  }

  const deletePost = async (postId: number) => {
    if (apiReachable.value !== false) {
      try {
        await getApi().deletePost(postId)
        apiReachable.value = true
      } catch { apiReachable.value = false }
    }
    posts.value = posts.value.filter(p => p.id !== postId)
    comments.value = comments.value.filter(c => c.postId !== postId)
  }

  const deleteComment = async (commentId: number) => {
    if (apiReachable.value !== false) {
      try {
        await getApi().deleteComment(commentId)
        apiReachable.value = true
      } catch { apiReachable.value = false }
    }
    const comment = comments.value.find(c => c.id === commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
    if (comment) {
      const post = posts.value.find(p => p.id === comment.postId)
      if (post && post.commentCount > 0) {
        post.commentCount = comments.value.filter(c => c.postId === comment.postId).length
      }
    }
  }

  const togglePinPost = async (postId: number) => {
    if (apiReachable.value !== false) {
      try {
        const updated = await getApi().togglePin(postId)
        const idx = posts.value.findIndex(p => p.id === postId)
        if (idx !== -1) posts.value[idx] = updated
        apiReachable.value = true
        return
      } catch { apiReachable.value = false }
    }
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.isPinned = !post.isPinned
    }
  }

  const toggleLockPost = async (postId: number) => {
    if (apiReachable.value !== false) {
      try {
        const updated = await getApi().toggleLock(postId)
        const idx = posts.value.findIndex(p => p.id === postId)
        if (idx !== -1) posts.value[idx] = updated
        apiReachable.value = true
        return
      } catch { apiReachable.value = false }
    }
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.isLocked = !post.isLocked
    }
  }

  const sendMessage = async (recipientId: number, content: string) => {
    if (apiReachable.value !== false) {
      try {
        const result = await getApi().sendMessage(recipientId, content)
        messages.value = [...messages.value, result]
        apiReachable.value = true
        return result
      } catch { apiReachable.value = false }
    }
    // Fallback to mock
    const { user } = useAuth()
    const currentUser: ForumUser = {
      id: user.value?.id ?? 0,
      name: user.value?.name ?? 'Anonymous',
      avatar: '👤',
      isAdmin: false,
    }
    const recipient = DEMO_USERS.find(u => u.id === recipientId) ?? DEMO_USERS[0]
    const newMsg: ForumMessage = {
      id: Math.max(0, ...messages.value.map(m => m.id)) + 1,
      sender: currentUser,
      recipient,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    messages.value = [...messages.value, newMsg]
    return newMsg
  }

  const markAsRead = async (messageId: number) => {
    if (apiReachable.value !== false) {
      try {
        await getApi().markMessageRead(messageId)
        apiReachable.value = true
      } catch { apiReachable.value = false }
    }
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) msg.isRead = true
  }

  const markConversationAsRead = async (partnerId: number) => {
    if (apiReachable.value !== false) {
      try {
        await getApi().markConversationRead(partnerId)
        apiReachable.value = true
      } catch { apiReachable.value = false }
    }
    const { user } = useAuth()
    const currentUserId = user.value?.id ?? 0
    messages.value.forEach(m => {
      if (m.sender.id === partnerId && m.recipient.id === currentUserId) {
        m.isRead = true
      }
    })
  }

  const searchPosts = async (query: string) => {
    const q = query.toLowerCase().trim()
    if (!q) return getPostsByCategory()
    // Try API first
    if (apiReachable.value !== false) {
      try {
        const results = await getApi().searchPosts(q)
        apiReachable.value = true
        return results
      } catch { apiReachable.value = false }
    }
    // Fallback to local search
    return localSearchPosts(q)
  }

  // Synchronous local search for computed properties
  const localSearchPosts = (query: string) => {
    const q = query.toLowerCase().trim()
    if (!q) return getPostsByCategory()
    return posts.value.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // Load comments for a specific post from API
  const loadCommentsForPost = async (postId: number) => {
    if (apiReachable.value === false) return
    try {
      const apiComments = await getApi().fetchComments(postId)
      // Merge with existing: remove old ones for this post, add new ones
      comments.value = [
        ...comments.value.filter(c => c.postId !== postId),
        ...apiComments,
      ]
      apiReachable.value = true
    } catch { apiReachable.value = false }
  }

  return {
    posts,
    comments,
    messages,
    FORUM_CATEGORIES,
    DEMO_USERS,
    formatRelativeTime,
    apiReachable,
    initFromApi,
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
    sendMessage,
    markAsRead,
    markConversationAsRead,
    searchPosts,
    localSearchPosts,
  }
}
