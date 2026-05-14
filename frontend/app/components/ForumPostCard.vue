<template>
  <article class="post-card" :class="{ 'post-card--pinned': post.isPinned, 'post-card--locked': post.isLocked }">
    <div class="post-card__header">
      <div class="post-card__category">
        <span class="post-card__category-icon">{{ categoryInfo?.icon }}</span>
        <span class="post-card__category-label">{{ categoryInfo?.label }}</span>
      </div>
      <div class="post-card__badges">
        <span v-if="post.isPinned" class="post-card__badge post-card__badge--pin">📌 置顶</span>
        <span v-if="post.isLocked" class="post-card__badge post-card__badge--lock">🔒 已锁定</span>
      </div>
    </div>

    <h3 class="post-card__title">
      <NuxtLink :to="`/forum/${post.id}`">{{ post.title }}</NuxtLink>
    </h3>

    <p class="post-card__excerpt">{{ excerpt }}</p>

    <div class="post-card__tags" v-if="post.tags.length">
      <span v-for="tag in post.tags" :key="tag" class="post-card__tag">{{ tag }}</span>
    </div>

    <div class="post-card__footer">
      <div class="post-card__author">
        <span class="post-card__avatar">{{ post.author.avatar }}</span>
        <span class="post-card__author-name">
          {{ post.author.name }}
          <span v-if="post.author.isAdmin" class="post-card__admin-badge">管理员</span>
        </span>
      </div>
      <div class="post-card__meta">
        <span class="post-card__stat" title="浏览量">👁 {{ formatCount(post.viewCount) }}</span>
        <span class="post-card__stat" title="点赞数">👍 {{ post.likeCount }}</span>
        <span class="post-card__stat" title="评论数">💬 {{ post.commentCount }}</span>
        <span class="post-card__time">{{ time }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ForumPost } from '~/composables/useForum'
import { useForum } from '~/composables/useForum'

const props = defineProps<{
  post: ForumPost
}>()

const { FORUM_CATEGORIES, formatRelativeTime } = useForum()

const categoryInfo = computed(() =>
  FORUM_CATEGORIES.find(c => c.value === props.post.category)
)

const excerpt = computed(() => {
  const text = props.post.content.replace(/\n/g, ' ').trim()
  return text.length > 120 ? text.slice(0, 120) + '…' : text
})

const time = computed(() => formatRelativeTime(props.post.createdAt))

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>
