export type ForumCategory =
  | 'general'
  | 'tech'
  | 'devbit'
  | 'help'
  | 'showcase'
  | 'announcement'

export interface ForumUser {
  id: number
  name: string
  avatar: string
  isAdmin: boolean
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
  likeCount: number
  likedByMe: boolean
  isPinned: boolean
  isLocked: boolean
}

export interface ForumComment {
  id: number
  postId: number
  author: ForumUser
  content: string
  createdAt: string
}

export interface ForumMessage {
  id: number
  sender: ForumUser
  recipient: ForumUser
  content: string
  createdAt: string
  isRead: boolean
}

export interface ForumBootstrap {
  users: ForumUser[]
  posts: ForumPost[]
  messages: ForumMessage[]
}

export interface CreatePostPayload {
  title: string
  content: string
  category: ForumCategory
  tags: string[]
}

export interface CreateCommentPayload {
  content: string
}

export interface SendMessagePayload {
  recipientId: number
  content: string
}

export const FORUM_CATEGORIES: {
  value: ForumCategory
  label: string
  icon: string
  desc: string
}[] = [
  {
    value: 'general',
    label: 'General',
    icon: 'Chat',
    desc: 'Open discussion for the community.'
  },
  {
    value: 'tech',
    label: 'Tech',
    icon: 'Code',
    desc: 'Deep technical discussion and engineering practice.'
  },
  {
    value: 'devbit',
    label: 'DevBit',
    icon: 'Brand',
    desc: 'Product updates and engineering notes from DevBit Tech.'
  },
  {
    value: 'help',
    label: 'Help',
    icon: 'Help',
    desc: 'Ask questions and get help from other members.'
  },
  {
    value: 'showcase',
    label: 'Showcase',
    icon: 'Launch',
    desc: 'Show the projects and experiments you are building.'
  },
  {
    value: 'announcement',
    label: 'Announcement',
    icon: 'News',
    desc: 'Official announcements and important notices.'
  }
]
