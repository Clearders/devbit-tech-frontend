import type { ForumCategory } from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'

export function getForumCategory(category: ForumCategory) {
  return FORUM_CATEGORIES.find((item) => item.value === category)
}

export function formatRelativeTime(dateString: string, now = Date.now()): string {
  const timestamp = new Date(dateString).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const difference = Math.max(0, now - timestamp)
  const minutes = Math.floor(difference / 60_000)
  const hours = Math.floor(difference / 3_600_000)
  const days = Math.floor(difference / 86_400_000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(timestamp))
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)?.value).join('-')
}

export function formatCount(count: number): string {
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)}w`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`
  return String(count)
}
