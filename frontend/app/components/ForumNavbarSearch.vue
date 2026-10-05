<script setup lang="ts">
import { Search } from '@lucide/vue'
import { gsap } from 'gsap'

const controls = useForumControls()
const { navigation, searchTarget, searchQuery, composing, popup } = controls
const id = `forum-search-${useId()}`
const panel = ref<HTMLElement>()
const field = ref<{ focus: () => void }>()
const mounted = ref(false)
const rendered = ref(false)
const open = computed(() => popup.value === 'search')
let context: gsap.Context | undefined
let timeline: gsap.core.Timeline | undefined
let media: gsap.MatchMedia | undefined
let reduced = false
let frame = 0
let disposed = false

function position() {
  if (!panel.value || !navigation.value || !searchTarget.value) return
  const navigationBounds = navigation.value.getBoundingClientRect()
  const trigger = searchTarget.value.getBoundingClientRect()
  const width = Math.min(480, document.documentElement.clientWidth - 24)
  const left = Math.max(12, Math.min(trigger.left + trigger.width / 2 - width / 2,
    document.documentElement.clientWidth - width - 12))
  Object.assign(panel.value.style, { left: `${left}px`, top: `${navigationBounds.bottom + 10}px`, width: `${width}px`,
    transformOrigin: `${trigger.left + trigger.width / 2 - left}px top`,
    maxHeight: `${Math.max(68, (window.visualViewport?.height ?? window.innerHeight) - navigationBounds.bottom - 22)}px` })
}
function schedulePosition() {
  if (!rendered.value || frame) return
  frame = requestAnimationFrame(() => { frame = 0; position() })
}
function close(returnFocus = false) {
  if (open.value) popup.value = null
  if (returnFocus) searchTarget.value?.focus({ preventScroll: true })
}
function outside(event: Event) {
  const target = event.target as Node | null
  if (open.value && !searchTarget.value?.contains(target) && !panel.value?.contains(target)) close()
}
watch(open, async active => {
  if (active) {
    rendered.value = true
    await nextTick()
    if (disposed || !open.value || !panel.value) return
    position()
    if (!timeline) context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, onReverseComplete: () => { if (!open.value) rendered.value = false } })
        .fromTo(panel.value!, { opacity: 0, y: -14, scaleY: .88 },
          { opacity: 1, y: 0, scaleY: 1, duration: .38, ease: 'back.out(1.4)' })
    }, panel.value)
    if (reduced) timeline?.progress(1).pause()
    else timeline?.play()
    field.value?.focus()
  } else {
    composing.value = false
    if (reduced || !timeline || timeline.progress() === 0) {
      timeline?.progress(0).pause()
      rendered.value = false
    } else timeline.reverse()
  }
})
let resize: ResizeObserver | undefined
onMounted(() => {
  mounted.value = true
  media = gsap.matchMedia()
  media.add({ reduce: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)' }, state => {
    reduced = !!state.conditions?.reduce
    if (reduced) { timeline?.progress(open.value ? 1 : 0).pause(); if (!open.value) rendered.value = false }
  })
  resize = new ResizeObserver(schedulePosition)
  if (navigation.value) resize.observe(navigation.value)
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  window.addEventListener('scroll', schedulePosition, { passive: true })
  window.addEventListener('resize', schedulePosition)
  window.visualViewport?.addEventListener('resize', schedulePosition)
})
onBeforeUnmount(() => {
  disposed = true
  close()
  composing.value = false
  cancelAnimationFrame(frame)
  resize?.disconnect()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  window.removeEventListener('scroll', schedulePosition)
  window.removeEventListener('resize', schedulePosition)
  window.visualViewport?.removeEventListener('resize', schedulePosition)
  media?.revert()
  context?.revert()
})
</script>

<template>
  <button ref="searchTarget" type="button" class="navbar__search" aria-label="搜索帖子" aria-haspopup="dialog"
    :aria-expanded="open" :aria-controls="id" @click="open ? close(true) : popup = 'search'" @keydown.esc.stop="close(true)">
    <Search :size="18" :stroke-width="1.75" />
  </button>
  <Teleport v-if="mounted" to="body">
    <div :id="id" ref="panel" class="forum-navbar-search" data-forum-popup role="dialog" aria-label="搜索帖子"
      :hidden="!rendered" :inert="!open" :aria-hidden="!open" @keydown.esc.stop.prevent="close(true)">
      <ForumSearchField ref="field" v-model="searchQuery" @composition="composing = $event" />
    </div>
  </Teleport>
</template>
