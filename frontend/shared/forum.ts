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
  comments: ForumComment[]
  messages: ForumMessage[]
}

export interface CreatePostPayload {
  title: string
  content: string
  category?: ForumCategory
  tags?: string[]
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
    label: '综合讨论',
    icon: '💬',
    desc: '日常交流、想法碰撞与社区话题。'
  },
  {
    value: 'tech',
    label: '技术实践',
    icon: '⚡',
    desc: '框架、工具链、工程经验与代码细节讨论。'
  },
  {
    value: 'devbit',
    label: 'DevBit 动态',
    icon: '◆',
    desc: 'DevBit Tech 的产品更新、版本进展与工程笔记。'
  },
  {
    value: 'help',
    label: '求助问答',
    icon: '🛟',
    desc: '提出问题，和社区一起定位解决方案。'
  },
  {
    value: 'showcase',
    label: '作品展示',
    icon: '★',
    desc: '展示正在构建的项目、实验与灵感。'
  },
  {
    value: 'announcement',
    label: '官方公告',
    icon: '📣',
    desc: '重要通知、社区规则与版本消息。'
  }
]
