<script setup lang="ts">
import type { ForumPost } from '~~/shared/forum'

defineProps<{
  postCount: number
  commentCount: number
  userCount: number
  hotPosts: ForumPost[]
  loading: boolean
  error: string
}>()
defineEmits<{ retry: [] }>()
const sections = [
  { id: 'stats', label: '社区统计', icon: '📊' },
  { id: 'hot', label: '热门帖子', icon: '🔥' },
  { id: 'rules', label: '社区规范', icon: '📋' },
] as const
const selected = ref('stats')
const compact = ref(false)
let media: MediaQueryList | undefined
const syncLayout = () => { compact.value = media?.matches ?? false }
onMounted(() => {
  media = window.matchMedia('(max-width: 1024px)')
  syncLayout()
  media.addEventListener('change', syncLayout)
})
onBeforeUnmount(() => media?.removeEventListener('change', syncLayout))
function onTabKey(event: KeyboardEvent, index: number) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length
  selected.value = sections[next]!.id
  const group = (event.currentTarget as HTMLElement).parentElement
  group?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
}
</script>

<template>
  <aside class="forum-layout__sidebar forum-community" aria-label="社区速览">
    <div class="forum-community__heading"><span>社区速览</span><span>了解这里，再加入讨论</span></div>
    <div class="forum-community__tabs" role="tablist" aria-label="社区信息">
      <button v-for="(section, index) in sections" :id="`community-tab-${section.id}`" :key="section.id"
        type="button" role="tab" :aria-selected="selected === section.id"
        :aria-controls="`community-panel-${section.id}`" :tabindex="selected === section.id ? 0 : -1"
        @click="selected = section.id" @keydown="onTabKey($event, index)">
        <span aria-hidden="true">{{ section.icon }}</span>{{ section.label }}
      </button>
    </div>
    <ScrollReveal v-for="section in sections" :key="section.id" class="forum-community__reveal" :data-active="selected === section.id">
      <section :id="`community-panel-${section.id}`"
        class="forum-sidebar-card forum-community__panel" :data-active="selected === section.id"
        :role="compact ? 'tabpanel' : 'region'" :tabindex="compact ? 0 : undefined"
        :aria-labelledby="compact ? `community-tab-${section.id}` : `community-title-${section.id}`"
        :aria-busy="section.id !== 'rules' && loading" data-transition-group="card">
        <h3 :id="`community-title-${section.id}`" class="forum-sidebar-card__title"><span aria-hidden="true">{{ section.icon }}</span> {{ section.label }}</h3>
        <template v-if="section.id === 'stats'">
          <dl class="forum-sidebar-card__stats">
            <div v-for="stat in [{ label: '帖子', value: postCount }, { label: '评论', value: commentCount }, { label: '用户', value: userCount }]"
              :key="stat.label" class="forum-sidebar-card__stat">
              <dt class="forum-sidebar-card__stat-label">{{ stat.label }}</dt>
              <dd class="forum-sidebar-card__stat-value">{{ loading || error ? '—' : stat.value.toLocaleString('zh-CN') }}</dd>
            </div>
          </dl>
          <p v-if="loading" class="forum-community__note" role="status">正在汇集社区数据…</p>
          <p v-else-if="error" class="forum-community__note">统计暂时无法加载。<button type="button" class="forum-community__retry" @click="$emit('retry')">重新加载</button></p>
          <p v-else class="forum-community__note">每一次分享，都是社区的一点积累。</p>
        </template>
        <template v-else-if="section.id === 'hot'">
          <p v-if="loading" class="forum-community__note" role="status">正在寻找热门讨论…</p>
          <p v-else-if="error" class="forum-community__note">热门帖子暂时无法加载。<button type="button" class="forum-community__retry" @click="$emit('retry')">重新加载</button></p>
          <ul v-else-if="hotPosts.length" class="forum-sidebar-card__hot-list">
            <li v-for="(post, index) in hotPosts" :key="post.id">
              <NuxtLink :to="`/forum/${post.id}`" class="forum-sidebar-card__hot-link">
                <span class="forum-community__rank" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="forum-sidebar-card__hot-title">{{ post.title }}</span>
                <span class="forum-sidebar-card__hot-meta" :aria-label="`${post.commentCount} 条评论`">💬 {{ post.commentCount }}</span>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="forum-community__note">还没有热门讨论。你的一个问题，也可以成为交流的起点。</p>
        </template>
        <ul v-else class="forum-sidebar-card__rules">
          <li>尊重他人，友善交流</li><li>禁止发布广告与垃圾信息</li><li>技术讨论请保持客观</li>
          <li>求助时请描述清楚问题</li><li>转载内容请注明出处</li>
        </ul>
      </section>
    </ScrollReveal>
  </aside>
</template>

<style scoped>
.forum-community { grid-column: 2; grid-row: 1; min-width: 0; }
.forum-community__heading, .forum-community__tabs { display: none; }
.forum-community__panel { min-width: 0; overflow-wrap: anywhere; }
.forum-community__note { font-size: .82rem; line-height: 1.7; color: var(--color-text-secondary); margin-top: .75rem; }
.forum-community__retry { border: 0; background: none; color: var(--color-primary-dark); font: inherit; text-decoration: underline; cursor: pointer; padding: .25rem; }
.forum-community__rank { color: var(--color-primary); font: 500 .75rem var(--font-mono); }
.forum-sidebar-card__stat-label { order: 1; }
.forum-sidebar-card__stat-value { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.forum-sidebar-card__hot-title { white-space: normal; overflow-wrap: anywhere; min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.forum-sidebar-card__hot-link { min-height: 44px; padding-inline: 0; }
.forum-community :is(button, a, [role='tabpanel']):focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (max-width: 1024px) {
  .forum-community { grid-column: 1; grid-row: auto; display: block; padding: 1rem; border: 1px solid var(--color-border-light); border-radius: 1.25rem; background: var(--color-surface); box-shadow: var(--shadow-sm); }
  .forum-community__heading { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: .25rem; margin-bottom: .75rem; font-weight: 700; font-size: .9rem; }
  .forum-community__heading span:last-child { font-size: .75rem; font-weight: 400; color: var(--color-text-muted); }
  .forum-community__tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: var(--color-bg); }
  .forum-community__tabs button { display: flex; gap: 5px; align-items: center; justify-content: center; min-height: 42px; padding: 6px 2px; border: 1px solid transparent; border-radius: 11px; background: transparent; color: var(--color-text-secondary); font: 600 .82rem var(--font-body); cursor: pointer; }
  .forum-community__tabs button[aria-selected='true'] { color: var(--color-primary-dark); background: var(--color-surface); border-color: var(--color-border-focus); box-shadow: var(--shadow-xs); }
  .forum-community__panel { margin: 0; padding: 1rem .25rem .15rem; border: 0; border-radius: 0; box-shadow: none; }
  .forum-community__reveal[data-active='false'] { display: none; }
  .forum-community__panel .forum-sidebar-card__title { display: none; }
  .forum-community__panel .forum-sidebar-card__rules { gap: .6rem; }
  .forum-community__panel .forum-sidebar-card__rules li { color: var(--color-text-secondary); }
  .forum-community__panel .forum-sidebar-card__stat-value { font-size: 1.5rem; }
}
@media (max-width: 360px) {
  .forum-community { padding: .75rem; }
  .forum-community__tabs button { font-size: .76rem; gap: 3px; }
  .forum-community__tabs button span { display: none; }
}
</style>
