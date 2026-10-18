<script setup lang="ts">
const formatRelativeTime = useRelativeTime()
import type { ForumPost } from '~~/shared/forum'
import { selectRecentPosts } from '~/utils/recentPosts'
import { stripMarkdown } from '~/utils/stripMarkdown'
import { getForumCategory } from '~/utils/forum'
const api = useForumApi()
const posts = ref<ForumPost[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
let alive = true, requestId = 0
async function load() {
  const id = ++requestId
  state.value = 'loading'
  try { const items = await api.fetchPosts(); if (alive && id === requestId) { posts.value = selectRecentPosts(items); state.value = 'ready' } }
  catch { if (alive && id === requestId) state.value = 'error' }
}
onMounted(load)
onBeforeUnmount(() => { alive = false; ++requestId })
</script>
<template>
  <section class="section home-recent" aria-labelledby="recent-title" :aria-busy="state === 'loading'">
    <div class="container">
      <div class="home-recent__header"><div><p class="home-recent__eyebrow">正在发生 · COMMUNITY</p><h2 id="recent-title" class="section__title">从这里加入讨论</h2><p class="section__subtitle">一个问题，也可能是下一次创造的起点。</p></div><NuxtLink to="/forum" class="btn btn--outline">查看全部讨论 ↗</NuxtLink></div>
      <div v-if="state === 'loading'" class="home-recent__grid" role="status" aria-label="正在加载近期讨论"><div v-for="n in 3" :key="n" class="recent-card recent-card--skeleton"><span></span><span></span><span></span></div></div>
      <div v-else-if="state === 'error'" class="home-recent__empty" role="status"><p>讨论暂时无法加载，其他功能仍可浏览。</p><button type="button" class="btn btn--outline" @click="load">重试加载</button></div>
      <div v-else-if="!posts.length" class="home-recent__empty"><p>讨论从第一个问题开始。</p><NuxtLink to="/forum" class="btn btn--primary">进入论坛</NuxtLink></div>
      <div v-else class="home-recent__grid"><article v-for="post in posts" :key="post.id" class="recent-card"><span class="recent-card__category">{{ getForumCategory(post.category)?.label }}</span><h3><NuxtLink :to="`/forum/${post.id}`">{{ post.title }}</NuxtLink></h3><p class="recent-card__excerpt">{{ stripMarkdown(post.content) }}</p><div class="recent-card__footer"><span>{{ post.author.name }}</span><time :datetime="post.createdAt">{{ formatRelativeTime(post.createdAt) }}</time></div></article></div>
    </div>
  </section>
</template>
