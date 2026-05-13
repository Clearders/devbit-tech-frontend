import type {
  CreatePostPayload,
  ForumBootstrap,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser,
  SendMessagePayload
} from '~~/shared/forum'

type ApiOptions = Parameters<typeof $fetch>[1]

export const useForumApi = () => {
  const config = useRuntimeConfig()

  const forumApi = <T>(path: string, options: ApiOptions = {}) => {
    const headers = new Headers(options.headers as HeadersInit | undefined)
    if (!headers.has('accept')) {
      headers.set('accept', 'application/json')
    }
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    const requestFetch = import.meta.server ? useRequestFetch() : $fetch
    return requestFetch<T>(path, {
      ...options,
      baseURL: config.public.apiBase as string,
      credentials: 'same-origin',
      headers,
      timeout: 10000,
      retry: 0
    })
  }

  return {
    fetchBootstrap(): Promise<ForumBootstrap> {
      return forumApi('/forum/bootstrap')
    },

    fetchUsers(): Promise<ForumUser[]> {
      return forumApi('/forum/users')
    },

    fetchPosts(category?: string): Promise<ForumPost[]> {
      const params = category && category !== 'all' ? { category } : undefined
      return forumApi('/forum/posts', { params })
    },

    fetchPost(id: number): Promise<ForumPost> {
      return forumApi(`/forum/posts/${id}`)
    },

    createPost(payload: CreatePostPayload): Promise<ForumPost> {
      return forumApi('/forum/posts', {
        method: 'POST',
        body: payload
      })
    },

    deletePost(id: number): Promise<void> {
      return forumApi(`/forum/posts/${id}`, { method: 'DELETE' })
    },

    togglePin(id: number): Promise<ForumPost> {
      return forumApi(`/forum/posts/${id}/pin`, { method: 'PUT' })
    },

    toggleLock(id: number): Promise<ForumPost> {
      return forumApi(`/forum/posts/${id}/lock`, { method: 'PUT' })
    },

    toggleLike(id: number): Promise<ForumPost> {
      return forumApi(`/forum/posts/${id}/like`, { method: 'PUT' })
    },

    searchPosts(query: string): Promise<ForumPost[]> {
      return forumApi('/forum/posts/search', {
        params: { q: query }
      })
    },

    fetchComments(postId: number): Promise<ForumComment[]> {
      return forumApi(`/forum/posts/${postId}/comments`)
    },

    createComment(postId: number, content: string): Promise<ForumComment> {
      return forumApi(`/forum/posts/${postId}/comments`, {
        method: 'POST',
        body: { content }
      })
    },

    deleteComment(id: number): Promise<void> {
      return forumApi(`/forum/comments/${id}`, { method: 'DELETE' })
    },

    fetchMessages(): Promise<ForumMessage[]> {
      return forumApi('/forum/messages')
    },

    sendMessage(payload: SendMessagePayload): Promise<ForumMessage> {
      return forumApi('/forum/messages', {
        method: 'POST',
        body: payload
      })
    },

    markMessageRead(id: number): Promise<void> {
      return forumApi(`/forum/messages/${id}/read`, { method: 'PUT' })
    },

    markConversationRead(partnerId: number): Promise<void> {
      return forumApi(`/forum/messages/conversation/${partnerId}/read`, {
        method: 'PUT'
      })
    }
  }
}
