import type { ForumPost } from '../../shared/forum'
// Explicit development fixtures; never selected by a production fallback.
export function mockForumPosts(): ForumPost[] {
  const now = Date.now()
  return [
    { title: '从一段代码开始，把想法变成小作品', content: '分享一个学习过程中写下的小工具。遇到的问题和解决过程，同样值得记录。', category: 'showcase' as const, name: '林间代码' },
    { title: '一道几何题，可以有多少种解法？', content: '从图形、代数和直觉出发，一起讨论问题背后的思路。公式 $S = ab / 2$ 只是起点。', category: 'help' as const, name: '向量与光' },
    { title: '在浏览器里观察光晕与颜色', content: '试着切换 Bloom，再对比色调映射。欢迎分享观察到的变化和实验心得。', category: 'tech' as const, name: '小步创作' },
  ].map((item, i) => ({ id: 9001 + i, title: item.title, content: item.content, category: item.category, author: { id: 1001 + i, name: item.name, avatar: item.name.slice(0, 1), isAdmin: false }, tags: [], createdAt: new Date(now - i * 3600000).toISOString(), updatedAt: new Date(now - i * 3600000).toISOString(), viewCount: 0, commentCount: 0, likeCount: 0, likedByMe: false, repostCount: 0, repostedByMe: false, isPinned: false, isLocked: false }))
}
