import type { ForumCategory } from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'

export function getForumCategory(category: ForumCategory) {
  return FORUM_CATEGORIES.find((item) => item.value === category)
}

export function formatRelativeTime(dateString: string): string {
  const timestamp = new Date(dateString).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const difference = Date.now() - timestamp
  const minutes = Math.floor(difference / 60_000)
  const hours = Math.floor(difference / 3_600_000)
  const days = Math.floor(difference / 86_400_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(timestamp).toLocaleDateString('en-US')
}

export function formatCount(count: number): string {
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)}w`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`
  return String(count)
}
