<template>
  <article class="post-card" :class="{ 'post-card--pinned': post.isPinned, 'post-card--locked': post.isLocked }">
    <div class="post-card__header">
      <div class="post-card__category">
        <component :is="categoryIcon" class="post-card__category-icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
        <span class="post-card__category-label">{{ categoryInfo?.label }}</span>
      </div>
      <div class="post-card__badges">
        <span v-if="post.isPinned" class="post-card__badge post-card__badge--pin"><Pin :size="13" :stroke-width="1.75" />置顶</span>
        <span v-if="post.isLocked" class="post-card__badge post-card__badge--lock"><LockKeyhole :size="13" :stroke-width="1.75" />已锁定</span>
      </div>
    </div>

    <h3 class="post-card__title">
      <NuxtLink :to="`/forum/${post.id}`">{{ post.title }}</NuxtLink>
    </h3>

    <p class="post-card__excerpt">{{ excerpt }}</p>

    <div class="post-card__footer">
      <div class="post-card__author">
        <AvatarImage
          :avatar-url="post.author.avatarUrl"
          :avatar="post.author.name.slice(0, 2).toUpperCase()"
          :name="post.author.name"
          size="sm"
        />
        <span class="post-card__author-name">
          {{ post.author.name }}
          <ShieldCheck v-if="post.author.isAdmin" class="post-card__admin-mark" :size="14" :stroke-width="1.75" aria-label="管理员" />
        </span>
        <time class="post-card__time" :datetime="post.createdAt">{{ time }}</time>
      </div>
      <div class="post-card__tags" v-if="post.tags.length">
        <span v-for="tag in post.tags" :key="tag" class="post-card__tag">{{ tag }}</span>
      </div>
      <div class="post-card__meta">
        <span class="post-card__stat" :aria-label="`${post.viewCount} 次浏览`" title="浏览量"><Eye :size="15" :stroke-width="1.75" />{{ formatCount(post.viewCount) }}</span>
        <span class="post-card__stat" :aria-label="`${post.likeCount} 个赞`" title="点赞数"><ThumbsUp :size="15" :stroke-width="1.75" />{{ formatCount(post.likeCount) }}</span>
        <span class="post-card__stat" :aria-label="`${post.commentCount} 条评论`" title="评论数"><MessageSquare :size="15" :stroke-width="1.75" />{{ formatCount(post.commentCount) }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { MessageSquare, Code2, Diamond, CircleHelp, Layers, Megaphone, Pin, LockKeyhole, Eye, ThumbsUp, ShieldCheck } from '@lucide/vue'
import type { ForumPost } from '~~/shared/forum'
import AvatarImage from '~/components/AvatarImage.vue'
import { formatCount, formatRelativeTime, getForumCategory } from '~/utils/forum'
import { stripMarkdown } from '~/utils/stripMarkdown'

const props = defineProps<{
  post: ForumPost
}>()

const categoryInfo = computed(() =>
  getForumCategory(props.post.category)
)
const categoryIcon = computed(() => ({ general: MessageSquare, tech: Code2, devbit: Diamond,
  help: CircleHelp, showcase: Layers, announcement: Megaphone })[props.post.category])

const excerpt = computed(() => stripMarkdown(props.post.content))

const time = computed(() => formatRelativeTime(props.post.createdAt))
</script>
