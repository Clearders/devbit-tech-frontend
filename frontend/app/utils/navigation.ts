// One order for the island and route motion, including authenticated tabs.
export const navigationItems = [
  { path: '/', label: '首页' },
  { path: '/forum', label: '论坛' },
  { path: '/forum/myposts', label: '我的帖子', authenticated: true },
  { path: '/games', label: '游戏' },
  { path: '/leaderboard', label: '排行榜' },
  { path: '/about', label: '团队介绍' },
]

export function navigationIndex(path: string) {
  const paths = [...navigationItems.map(item => item.path), '/settings', '/login', '/register']
  // Match the most specific section first (e.g. myposts before forum).
  return paths.reduce((match, section, index) => (
    path === section || (section !== '/' && path.startsWith(`${section}/`))
  ) ? index : match, -1)
}

export function navigationDirection(to: string, from: string): number {
  const target = navigationIndex(to)
  const source = navigationIndex(from)
  return target < 0 || source < 0 ? 0 : Math.sign(target - source)
}
