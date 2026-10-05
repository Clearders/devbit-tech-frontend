<script setup lang="ts">
import { BarChart3, BookOpen, TrendingUp, Users, X, MessageSquare } from '@lucide/vue'
import { gsap } from 'gsap'
import type { ForumPost } from '~~/shared/forum'

defineProps<{ postCount: number; commentCount: number; userCount: number; hotPosts: ForumPost[]; loading: boolean; error: string }>()
defineEmits<{ retry: [] }>()
const id = useId()
const sections = [
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'hot', label: '热门', icon: TrendingUp },
  { id: 'rules', label: '规范', icon: BookOpen },
] as const
const selected = ref('stats')
const open = ref(false)
const rendered = ref(false)
const trigger = ref<HTMLButtonElement>()
const popup = ref<HTMLElement>()
const content = ref<HTMLElement>()
const body = ref<HTMLElement>()
const position = ref<Record<string, string>>({})
let context: gsap.Context | undefined
let media: gsap.MatchMedia | undefined
let timeline: gsap.core.Timeline | undefined
let observer: ResizeObserver | undefined
let reduced = false
let previousHeight = 0
let frame = 0
let disposed = false

function place() {
  if (!rendered.value || !popup.value || !trigger.value) return
  const bounds = trigger.value.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const width = Math.min(360, viewportWidth - 24)
  const height = popup.value.offsetHeight
  const below = bounds.bottom + 8
  const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - height - 8)
  position.value = { width: `${width}px`, left: `${Math.max(12, Math.min(bounds.right - width, viewportWidth - width - 12))}px`,
    top: `${top}px`, maxHeight: `${window.innerHeight - top - 12}px` }
}
function schedulePlace() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(place)
}
function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus({ preventScroll: true })
  if (reduced || !timeline || timeline.progress() === 0) {
    timeline?.progress(0).pause()
    rendered.value = false
    return
  }
  timeline.timeScale(1.2).reverse()
}
async function toggle() {
  if (open.value) { close(true); return }
  open.value = rendered.value = true
  await nextTick()
  if (disposed || !open.value || !popup.value) return
  place()
  if (!timeline) context?.add(() => {
    timeline = gsap.timeline({ paused: true, onReverseComplete: () => { if (!open.value) rendered.value = false } })
      .fromTo(popup.value!, { opacity: 0, y: 6, scale: .98 },
        { opacity: 1, y: 0, scale: 1, duration: .3, ease: 'back.out(1.1)' })
  })
  if (reduced) timeline?.progress(1).pause()
  else timeline?.timeScale(1).play()
  popup.value.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
}
function onTabKey(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length
  selected.value = sections[next]!.id
  popup.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(true) }
  if (event.key !== 'Tab' || !popup.value) return
  const focusable = [...popup.value.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), a, [tabindex="0"]')].filter(el => el.getClientRects().length)
  if (event.shiftKey && document.activeElement === focusable[0]
    || !event.shiftKey && document.activeElement === focusable.at(-1)) {
    trigger.value?.focus({ preventScroll: true })
    close()
  }
}
function outside(event: Event) {
  const target = event.target as Node | null
  if (!trigger.value?.contains(target) && !popup.value?.contains(target)) close()
}
watch(selected, () => nextTick(schedulePlace))
onMounted(() => {
  context = gsap.context(() => {}, popup.value)
  media = gsap.matchMedia()
  media.add({ reduce: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)' }, state => {
    reduced = !!state.conditions?.reduce
    if (reduced) {
      timeline?.progress(open.value ? 1 : 0).pause()
      for (const tween of context?.getTweens() ?? []) if (tween.isActive()) tween.progress(1)
    }
  })
  observer = new ResizeObserver(() => {
    const height = body.value?.getBoundingClientRect().height ?? 0
    if (open.value && content.value && previousHeight && Math.abs(height - previousHeight) > .5) {
      const target = content.value
      if (!target.style.height) gsap.set(target, { height: previousHeight, overflow: 'hidden' })
      context?.add(() => gsap.to(target, { height, duration: reduced ? 0 : .3, ease: 'power3.out', overwrite: true,
        onUpdate: schedulePlace, onComplete: () => { gsap.set(target, { clearProps: 'height,overflow' }); schedulePlace() } }))
    }
    previousHeight = height
    schedulePlace()
  })
  if (body.value) observer.observe(body.value)
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('focusin', outside, true)
  window.addEventListener('resize', schedulePlace)
  window.addEventListener('scroll', schedulePlace, true)
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(frame)
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('focusin', outside, true)
  window.removeEventListener('resize', schedulePlace)
  window.removeEventListener('scroll', schedulePlace, true)
  media?.revert()
  context?.revert()
})
</script>

<template>
  <div class="forum-community-entry">
    <button ref="trigger" type="button" class="forum-header-action" data-forum-control aria-haspopup="dialog"
      :aria-expanded="open" :aria-controls="id" aria-label="社区速览" @click="toggle">
      <span class="forum-control-icon" data-forum-icon><Users :size="18" :stroke-width="1.75" /></span>
      <span class="forum-community-entry__label">社区速览</span>
    </button>
    <Teleport to="body">
      <section :id="id" ref="popup" class="forum-community-popup" role="dialog" :aria-labelledby="`${id}-title`"
        :hidden="!rendered" :inert="!open" :style="position" @keydown="onKey">
        <div class="forum-community-popup__heading">
          <h2 :id="`${id}-title`">社区速览</h2>
          <button type="button" aria-label="关闭社区速览" @click="close(true)"><X :size="18" :stroke-width="1.75" /></button>
        </div>
        <div class="forum-community-popup__tabs" role="tablist" aria-label="社区信息">
          <button v-for="(section, index) in sections" :id="`${id}-tab-${section.id}`" :key="section.id"
            type="button" role="tab" :aria-selected="selected === section.id" :aria-controls="`${id}-panel-${section.id}`"
            :tabindex="selected === section.id ? 0 : -1" @click="selected = section.id" @keydown="onTabKey($event, index)">
            <component :is="section.icon" :size="16" :stroke-width="1.75" />{{ section.label }}
          </button>
        </div>
        <div ref="content" class="forum-community-popup__content">
          <div ref="body" class="forum-community-popup__body">
            <section v-for="section in sections" v-show="selected === section.id" :id="`${id}-panel-${section.id}`"
              :key="section.id" role="tabpanel" tabindex="0" :aria-labelledby="`${id}-tab-${section.id}`"
              :aria-busy="section.id !== 'rules' && loading">
              <template v-if="section.id === 'stats'">
                <dl class="forum-community-popup__stats">
                  <div v-for="stat in [{ label: '帖子', value: postCount }, { label: '评论', value: commentCount }, { label: '用户', value: userCount }]" :key="stat.label">
                    <dt>{{ stat.label }}</dt><dd>{{ loading || error ? '—' : stat.value.toLocaleString('zh-CN') }}</dd>
                  </div>
                </dl>
                <p v-if="loading" role="status">正在汇集社区数据…</p>
                <p v-else-if="error">统计暂时无法加载。<button type="button" @click="$emit('retry')">重新加载</button></p>
                <p v-else>每一次分享，都是社区的一点积累。</p>
              </template>
              <template v-else-if="section.id === 'hot'">
                <p v-if="loading" role="status">正在寻找热门讨论…</p>
                <p v-else-if="error">热门帖子暂时无法加载。<button type="button" @click="$emit('retry')">重新加载</button></p>
                <ol v-else-if="hotPosts.length" class="forum-community-popup__hot">
                  <li v-for="(post, index) in hotPosts" :key="post.id">
                    <NuxtLink :to="`/forum/${post.id}`" @click="close()">
                      <span class="forum-community-popup__rank">{{ String(index + 1).padStart(2, '0') }}</span>
                      <span class="forum-community-popup__post-title">{{ post.title }}</span>
                      <span class="forum-community-popup__comments" :aria-label="`${post.commentCount} 条评论`"><MessageSquare :size="14" :stroke-width="1.75" />{{ post.commentCount }}</span>
                    </NuxtLink>
                  </li>
                </ol>
                <p v-else>还没有热门讨论，来发起第一个话题吧。</p>
              </template>
              <ul v-else class="forum-community-popup__rules">
                <li>尊重他人，友善交流</li><li>禁止发布广告与垃圾信息</li><li>技术讨论请保持客观</li>
                <li>求助时请描述清楚问题</li><li>转载内容请注明出处</li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </Teleport>
  </div>
</template>
