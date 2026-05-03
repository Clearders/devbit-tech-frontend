import type {
  ForumPost,
  ForumComment,
  ForumMessage,
  ForumCategory,
} from './useForum'

// ── Types matching the backend JSON ──

interface BackendPost {
  id: number
  title: string
  content: string
  author: { id: number; name: string; avatar: string; is_admin: boolean }
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  view_count: number
  comment_count: number
  is_pinned: boolean
  is_locked: boolean
}

interface BackendComment {
  id: number
  post_id: number
  author: { id: number; name: string; avatar: string; is_admin: boolean }
  content: string
  created_at: string
}

interface BackendMessage {
  id: number
  sender: { id: number; name: string; avatar: string; is_admin: boolean }
  recipient: { id: number; name: string; avatar: string; is_admin: boolean }
  content: string
  created_at: string
  is_read: boolean
}

// ── Mapping helpers ──

function mapPost(bp: BackendPost): ForumPost {
  return {
    id: bp.id,
    title: bp.title,
    content: bp.content,
    author: {
      id: bp.author.id,
      name: bp.author.name,
      avatar: bp.author.avatar,
      isAdmin: bp.author.is_admin,
    },
    category: bp.category as ForumCategory,
    tags: bp.tags,
    createdAt: bp.created_at,
    updatedAt: bp.updated_at,
    viewCount: bp.view_count,
    commentCount: bp.comment_count,
    isPinned: bp.is_pinned,
    isLocked: bp.is_locked,
  }
}

function mapComment(bc: BackendComment): ForumComment {
  return {
    id: bc.id,
    postId: bc.post_id,
    author: {
      id: bc.author.id,
      name: bc.author.name,
      avatar: bc.author.avatar,
      isAdmin: bc.author.is_admin,
    },
    content: bc.content,
    createdAt: bc.created_at,
  }
}

function mapMessage(bm: BackendMessage): ForumMessage {
  return {
    id: bm.id,
    sender: {
      id: bm.sender.id,
      name: bm.sender.name,
      avatar: bm.sender.avatar,
      isAdmin: bm.sender.is_admin,
    },
    recipient: {
      id: bm.recipient.id,
      name: bm.recipient.name,
      avatar: bm.recipient.avatar,
      isAdmin: bm.recipient.is_admin,
    },
    content: bm.content,
    createdAt: bm.created_at,
    isRead: bm.is_read,
  }
}

// ── API client ──

export const useForumApi = () => {
  const config = useRuntimeConfig()
  const forumApi = $fetch.create({
    baseURL: config.public.apiBase as string,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    timeout: 10000,
  })

  return {
    // ── Posts ──

    async fetchPosts(category?: string): Promise<ForumPost[]> {
      const params = category && category !== 'all' ? { category } : undefined
      const data = await forumApi<BackendPost[]>('/forum/posts', { params })
      return data.map(mapPost)
    },

    async fetchPost(id: number): Promise<ForumPost | null> {
      try {
        const data = await forumApi<BackendPost>(`/forum/posts/${id}`)
        return mapPost(data)
      } catch {
        return null
      }
    },

    async createPost(payload: {
      title: string
      content: string
      category: string
      tags: string[]
    }): Promise<ForumPost> {
      const data = await forumApi<BackendPost>('/forum/posts', {
        method: 'POST',
        body: payload,
      })
      return mapPost(data)
    },

    async deletePost(id: number): Promise<void> {
      await forumApi(`/forum/posts/${id}`, { method: 'DELETE' })
    },

    async togglePin(id: number): Promise<ForumPost> {
      const data = await forumApi<BackendPost>(`/forum/posts/${id}/pin`, {
        method: 'PUT',
      })
      return mapPost(data)
    },

    async toggleLock(id: number): Promise<ForumPost> {
      const data = await forumApi<BackendPost>(`/forum/posts/${id}/lock`, {
        method: 'PUT',
      })
      return mapPost(data)
    },

    async searchPosts(query: string): Promise<ForumPost[]> {
      const data = await forumApi<BackendPost[]>('/forum/posts/search', {
        params: { q: query },
      })
      return data.map(mapPost)
    },

    // ── Comments ──

    async fetchComments(postId: number): Promise<ForumComment[]> {
      const data = await forumApi<BackendComment[]>(
        `/forum/posts/${postId}/comments`
      )
      return data.map(mapComment)
    },

    async createComment(
      postId: number,
      content: string
    ): Promise<ForumComment> {
      const data = await forumApi<BackendComment>(
        `/forum/posts/${postId}/comments`,
        {
          method: 'POST',
          body: { content },
        }
      )
      return mapComment(data)
    },

    async deleteComment(id: number): Promise<void> {
      await forumApi(`/forum/comments/${id}`, { method: 'DELETE' })
    },

    // ── Messages ──

    async fetchMessages(): Promise<ForumMessage[]> {
      const data = await forumApi<BackendMessage[]>('/forum/messages')
      return data.map(mapMessage)
    },

    async sendMessage(
      recipientId: number,
      content: string
    ): Promise<ForumMessage> {
      const data = await forumApi<BackendMessage>('/forum/messages', {
        method: 'POST',
        body: { recipient_id: recipientId, content },
      })
      return mapMessage(data)
    },

    async markMessageRead(id: number): Promise<void> {
      await forumApi(`/forum/messages/${id}/read`, { method: 'PUT' })
    },

    async markConversationRead(partnerId: number): Promise<void> {
      await forumApi(`/forum/messages/conversation/${partnerId}/read`, {
        method: 'PUT',
      })
    },
  }
}
