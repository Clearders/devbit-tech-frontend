import { mockForumPosts } from '~/utils/forumMock'
import type {
  CreatePostPayload,
  ForumBootstrap,
  ForumComment,
  ForumMessage,
  ForumPost,
  ForumUser,
  SendMessagePayload,
  FriendInfo,
  AddFriendPayload
} from '~~/shared/forum'

export const useForumApi = () => {
  const { apiFetch: forumApi } = useApiFetch()
  const app = useNuxtApp()
  const isMock = import.meta.dev && useRuntimeConfig().public.socialMode === 'mock'
  const social = () => app.runWithContext(() => useSocialApi()) as ReturnType<typeof useSocialApi>

  return {
    async fetchBootstrap(): Promise<ForumBootstrap> {
      if (isMock) return { users: (await social().searchUsers('')).items, posts: mockForumPosts(), comments: [], messages: await social().listMessages() }
      return forumApi('/forum/bootstrap')
    },

    fetchUsers(): Promise<ForumUser[]> {
      return forumApi('/forum/users')
    },

    fetchPosts(category?: string): Promise<ForumPost[]> {
      if (isMock) return Promise.resolve(mockForumPosts().filter(p => !category || category === 'all' || p.category === category))
      const params = category && category !== 'all' ? { category } : undefined
      return forumApi('/forum/posts', { params })
    },

    fetchPost(id: number): Promise<ForumPost> {
      if (isMock) { const post = mockForumPosts().find(p => p.id === id); return post ? Promise.resolve(post) : Promise.reject(new Error('样例帖子不存在')) }
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

    fetchMyPosts(): Promise<ForumPost[]> {
      return forumApi('/forum/posts/myposts')
    },

    modifyPost(id: number, content: string): Promise<void> {
      return forumApi(`/forum/posts/myposts/modify_post/${id}`, {
        method: 'PUT',
        body: { content }
      })
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
      if (isMock) return Promise.resolve(mockForumPosts().filter(p => (p.title + p.content).includes(query)))
      return forumApi('/forum/posts/search', {
        params: { q: query }
      })
    },

    fetchComments(postId: number): Promise<ForumComment[]> {
      if (isMock) return Promise.resolve([])
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
      if (isMock) return social().listMessages()
      return forumApi('/forum/messages')
    },

    sendMessage(payload: SendMessagePayload): Promise<ForumMessage> {
      if (isMock) return social().sendMessage(payload.recipientId, payload.content)
      return forumApi('/forum/messages', {
        method: 'POST',
        body: payload
      })
    },

    markMessageRead(id: number): Promise<void> {
      if (isMock) return social().markMessageRead(id)
      return forumApi(`/forum/messages/${id}/read`, { method: 'PUT' })
    },

    markConversationRead(partnerId: number): Promise<void> {
      if (isMock) return social().markConversationRead(partnerId)
      return forumApi(`/forum/messages/conversation/${partnerId}/read`, {
        method: 'PUT'
      })
    },

    fetchFriends(): Promise<FriendInfo[]> {
      if (isMock) return social().listFriends().then(p => p.items)
      return forumApi('/forum/friends')
    },

    addFriend(payload: AddFriendPayload): Promise<FriendInfo> {
      return forumApi('/forum/friends', {
        method: 'POST',
        body: payload
      })
    },

    removeFriend(friendId: number): Promise<void> {
      return forumApi(`/forum/friends/${friendId}`, { method: 'DELETE' })
    },

    searchUsers(query: string): Promise<ForumUser[]> {
      return forumApi('/forum/users/search', {
        params: { q: query }
      })
    }
  }
}
