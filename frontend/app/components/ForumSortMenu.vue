<script setup lang="ts" generic="T extends string">
import { Check, ChevronDown, ArrowDownWideNarrow } from '@lucide/vue'
import { gsap } from 'gsap'

const props = withDefaults(defineProps<{ modelValue: T; choices?: { value: T; label: string }[]; compact?: boolean; active?: boolean; dismiss?: boolean }>(), { active: true })
const emit = defineEmits<{ 'update:modelValue': [value: T]; 'open-change': [open: boolean] }>()
const defaultChoices = [
  { value: 'latest', label: '最新发布' }, { value: 'active', label: '讨论最多' },
  { value: 'views', label: '浏览最多' }, { value: 'likes', label: '点赞最多' },
]
const choices = computed(() => props.choices ?? defaultChoices as { value: T; label: string }[])
const id = `forum-sort-${useId()}`
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const chevron = ref<HTMLElement>()
const menu = ref<HTMLElement>()
const mounted = ref(false)
const rendered = ref(false)
const open = ref(false)
const activeIndex = ref(0)
const label = computed(() => choices.value.find(choice => choice.value === props.modelValue)?.label ?? choices.value[0]!.label)
let context: gsap.Context | undefined
let timeline: gsap.core.Timeline | undefined
let media: gsap.MatchMedia | undefined
let reduced = false
let positionFrame = 0
let disposed = false

function position() {
  if (!trigger.value || !menu.value) return
  const bounds = trigger.value.getBoundingClientRect()
  const navigation = root.value?.closest('.navbar__group')?.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const width = Math.min(Math.max(bounds.width, 208), viewportWidth - 24)
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const bottom = Math.max(bounds.bottom, navigation?.bottom ?? bounds.bottom)
  const height = Math.min(menu.value.scrollHeight, viewportHeight - 24)
  const above = !navigation && bottom + 8 + height > viewportHeight - 12 && bounds.top > height + 12
  Object.assign(menu.value.style, {
    width: `${width}px`, left: `${Math.max(12, Math.min(bounds.right - width, viewportWidth - width - 12))}px`,
    top: `${above ? bounds.top - height - 8 : bottom + 8}px`,
    maxHeight: `${Math.max(44, above ? bounds.top - 20 : viewportHeight - bottom - 20)}px`, transformOrigin: above ? 'bottom right' : 'top right',
  })
}
function schedulePosition() {
  if (!rendered.value || positionFrame) return
  positionFrame = requestAnimationFrame(() => { positionFrame = 0; position() })
}
function option(index: number) { return menu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index] }
function focusOption(index: number) {
  activeIndex.value = (index + choices.value.length) % choices.value.length
  void nextTick(() => option(activeIndex.value)?.focus({ preventScroll: true }))
}
async function show(index = choices.value.findIndex(choice => choice.value === props.modelValue)) {
  if (!props.active) return
  open.value = true
  emit('open-change', true)
  rendered.value = true
  activeIndex.value = Math.max(0, index)
  await nextTick()
  if (disposed || !open.value || !menu.value) return
  position()
  if (!timeline) {
    context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, onReverseComplete: () => { if (!open.value) rendered.value = false } })
        .fromTo(menu.value!, { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: .24, ease: 'power3.out' }, 0)
        .to(chevron.value!, { rotation: 180, duration: .2, ease: 'power2.inOut' }, 0)
        .fromTo(menu.value!.querySelectorAll('[role="option"]'), { opacity: 0 },
          { opacity: 1, duration: .14, stagger: .018, ease: 'power2.out' }, .04)
    }, menu.value)
  }
  if (reduced) timeline?.progress(1).pause()
  else timeline?.timeScale(1).play()
  focusOption(activeIndex.value)
}
function close(returnFocus = false) {
  const wasOpen = open.value
  open.value = false
  if (wasOpen) emit('open-change', false)
  if (returnFocus) trigger.value?.focus({ preventScroll: true })
  if (reduced || !timeline || timeline.progress() === 0) {
    timeline?.progress(0).pause()
    rendered.value = false
  } else timeline.timeScale(1.35).reverse()
}
function select(index: number) {
  emit('update:modelValue', choices.value[index]!.value)
  close(true)
}
function onTriggerKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    void show(event.key === 'ArrowUp' ? choices.value.length - 1 : undefined)
  } else if (event.key === 'Escape') close(true)
}
function onMenuKey(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault()
  if (event.key === 'ArrowDown') focusOption(activeIndex.value + 1)
  else if (event.key === 'ArrowUp') focusOption(activeIndex.value - 1)
  else if (event.key === 'Home') focusOption(0)
  else if (event.key === 'End') focusOption(choices.value.length - 1)
  else if (event.key === 'Enter' || event.key === ' ') select(activeIndex.value)
  else if (event.key === 'Escape') close(true)
  else if (event.key === 'Tab') { trigger.value?.focus({ preventScroll: true }); close() }
}
function outside(event: Event) {
  const target = event.target as Node | null
  if (open.value && !root.value?.contains(target) && !menu.value?.contains(target)) close()
}
watch(() => props.active, active => { if (!active) close() })
watch(() => props.dismiss, dismiss => { if (dismiss) close() })
let resize: ResizeObserver | undefined
onMounted(() => {
  mounted.value = true
  media = gsap.matchMedia()
  media.add({ reduced: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)' }, state => {
    reduced = !!state.conditions?.reduced
    if (reduced) { timeline?.progress(open.value ? 1 : 0).pause(); if (!open.value) rendered.value = false }
  })
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  window.addEventListener('resize', schedulePosition)
  window.addEventListener('scroll', schedulePosition, true)
  window.visualViewport?.addEventListener('resize', schedulePosition)
  resize = new ResizeObserver(schedulePosition)
  if (trigger.value) resize.observe(trigger.value)
  const navigation = root.value?.closest('.navbar__group')
  if (navigation) resize.observe(navigation)
})
onBeforeUnmount(() => {
  disposed = true
  close()
  resize?.disconnect()
  cancelAnimationFrame(positionFrame)
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  window.removeEventListener('resize', schedulePosition)
  window.removeEventListener('scroll', schedulePosition, true)
  window.visualViewport?.removeEventListener('resize', schedulePosition)
  media?.revert()
  context?.revert()
})
</script>

<template>
  <div ref="root" class="forum-sort-menu" :class="{ 'forum-sort-menu--compact': compact }">
    <button :id="`${id}-trigger`" ref="trigger" type="button" class="forum-sort-menu__trigger" data-forum-control
      :aria-expanded="open" :aria-controls="`${id}-list`" aria-haspopup="listbox"
      :aria-label="`排序：${label}`" @click="open ? close(true) : show()" @keydown="onTriggerKey">
      <span class="forum-control-icon" data-forum-icon><ArrowDownWideNarrow :size="18" :stroke-width="1.75" /></span>
      <span class="forum-sort-menu__caption">排序</span><span>{{ label }}</span>
      <span ref="chevron" class="forum-sort-menu__chevron"><ChevronDown :size="16" :stroke-width="1.75" /></span>
    </button>
    <Teleport v-if="mounted" to="body">
      <div :id="`${id}-list`" ref="menu" class="forum-sort-menu__popup" data-forum-popup role="listbox" aria-label="帖子排序"
        :hidden="!rendered" :inert="!open" :aria-hidden="!open" @keydown="onMenuKey">
        <button v-for="(choice, index) in choices" :key="choice.value" type="button" role="option"
          :aria-selected="modelValue === choice.value" :tabindex="open && activeIndex === index ? 0 : -1"
          :class="{ 'is-selected': modelValue === choice.value }" @focus="activeIndex = index" @click="select(index)">
          <span>{{ choice.label }}</span><Check v-if="modelValue === choice.value" :size="16" :stroke-width="1.75" />
        </button>
      </div>
    </Teleport>
  </div>
</template>
