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
    },

    fetchFriends(): Promise<FriendInfo[]> {
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
