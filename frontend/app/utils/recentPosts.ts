import type { ForumPost } from '../../shared/forum'
export function selectRecentPosts(posts: ForumPost[], count = 3): ForumPost[] {
  const time = (value: string) => { const result = Date.parse(value); return Number.isFinite(result) ? result : 0 }
  return [...posts].sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.id - a.id).slice(0, count)
}
