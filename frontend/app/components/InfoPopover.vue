<script setup lang="ts">
import type { Component } from 'vue'
import { CircleHelp, X } from '@lucide/vue'
import { infoPanelContains, placeInfoPanel } from '~/utils/infoPanel'

withDefaults(defineProps<{ label: string; icon?: Component }>(), { icon: CircleHelp })
const id = useId()
const open = ref(false)
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const position = ref<Record<string, string>>({})
const route = useRoute()
let observer: ResizeObserver | undefined
let frame = 0
let disposed = false

function place() {
  if (!open.value || !trigger.value || !panel.value) return
  const box = placeInfoPanel(trigger.value.getBoundingClientRect(),
    { width: document.documentElement.clientWidth, height: window.innerHeight }, panel.value.scrollHeight)
  position.value = Object.fromEntries(Object.entries(box).map(([key, value]) => [key, `${value}px`]))
}
function schedulePlace() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(place)
}
function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  observer?.disconnect()
  if (returnFocus) trigger.value?.focus({ preventScroll: true })
}
async function toggle() {
  if (open.value) { close(); return }
  document.dispatchEvent(new CustomEvent('devbit:info-panel', { detail: id }))
  open.value = true
  await nextTick()
  if (disposed || !open.value || !panel.value) return
  place()
  observer?.observe(panel.value)
  if (trigger.value) observer?.observe(trigger.value)
  panel.value.focus({ preventScroll: true })
}
function outside(event: Event) {
  if (!infoPanelContains(event.target as Node | null, trigger.value, panel.value)) close(false)
}
function onKey(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') { event.preventDefault(); close() }
}
function onOtherPanel(event: Event) {
  if ((event as CustomEvent<string>).detail !== id) close(false)
}
function beforeLeave(element: Element) {
  // Leaving panels must stop accepting input as soon as another one opens.
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}
watch(() => route.fullPath, () => close(false))
onMounted(() => {
  observer = new ResizeObserver(schedulePlace)
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  document.addEventListener('keydown', onKey)
  document.addEventListener('devbit:info-panel', onOtherPanel)
  window.addEventListener('resize', schedulePlace)
  window.addEventListener('scroll', schedulePlace, true)
})
onBeforeUnmount(() => {
  disposed = true
  if (panel.value?.contains(document.activeElement)) trigger.value?.focus({ preventScroll: true })
  observer?.disconnect()
  cancelAnimationFrame(frame)
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('devbit:info-panel', onOtherPanel)
  window.removeEventListener('resize', schedulePlace)
  window.removeEventListener('scroll', schedulePlace, true)
})
</script>

<template>
  <button ref="trigger" type="button" class="info-panel-trigger" :aria-expanded="open" :aria-controls="`${id}-panel`"
    aria-haspopup="dialog" @click="toggle">
    <component :is="icon" :size="18" :stroke-width="1.75" aria-hidden="true" />{{ label }}
  </button>
  <Teleport to="body">
    <Transition name="info-panel" @before-leave="beforeLeave">
      <section v-if="open" :id="`${id}-panel`" ref="panel" class="info-panel" role="dialog" :aria-labelledby="`${id}-title`" tabindex="-1" :style="position">
        <div class="info-panel__heading">
          <h2 :id="`${id}-title`">{{ label }}</h2>
          <button type="button" :aria-label="`关闭${label}`" @click="close()"><X :size="18" :stroke-width="1.75" aria-hidden="true" /></button>
        </div>
        <div class="info-panel__body"><slot :close="close" /></div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-panel-trigger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 14px; white-space: nowrap; border: 1px solid var(--color-border); border-radius: 8px; background: rgb(255 255 255 / .8); color: var(--color-text-secondary); font: 500 14px var(--font-body); cursor: pointer; }
.info-panel-trigger:hover, .info-panel-trigger[aria-expanded='true'] { color: var(--color-primary-dark); border-color: var(--color-border-focus); background: #f1f6ff; }
.info-panel { position: fixed; z-index: 310; padding: 8px 16px 16px; overflow: auto; overscroll-behavior: contain; border: 1px solid var(--color-border); border-radius: 10px; background: rgb(255 255 255 / .97); backdrop-filter: blur(12px); box-shadow: 0 8px 28px rgb(30 30 46 / .09); font: 400 14px/1.7 var(--font-body); color: var(--color-text-secondary); }
.info-panel__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.info-panel__heading h2 { font-size: 14px; font-weight: 650; color: var(--color-text); }
.info-panel__heading button { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; margin-right: -8px; border: 0; border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.info-panel__heading button:hover { background: var(--color-primary-o06); }
.info-panel__body :deep(h3) { font-size: 14px; color: var(--color-text); margin-bottom: 12px; }
.info-panel__body :deep(.panel-tabs) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; border-bottom: 1px solid var(--color-border-light); margin-bottom: 16px; }
.info-panel__body :deep(.panel-tabs button) { min-height: 44px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: inherit; cursor: pointer; font: 500 13px var(--font-body); }
.info-panel__body :deep(.panel-tabs button[aria-selected='true']) { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); }
.info-panel__body :deep(.panel-stats) { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; gap: 8px; padding: 12px 0; }
.info-panel__body :deep(.panel-stats dt) { font-size: 12px; }
.info-panel__body :deep(.panel-stats dd) { font-size: 24px; color: var(--color-primary-dark); font-variant-numeric: tabular-nums; font-weight: 600; }
.info-panel__body :deep(.panel-info) { list-style: none; }
.info-panel__body :deep(.panel-info li) { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--color-border-light); overflow-wrap: anywhere; }
.info-panel__body :deep(.panel-links) { list-style: none; }
.info-panel__body :deep(.panel-links a) { display: flex; gap: 12px; justify-content: space-between; align-items: center; min-height: 44px; color: var(--color-text-secondary); }
.info-panel__body :deep(.panel-links a span:first-child) { min-width: 0; overflow-wrap: anywhere; }
.info-panel__body :deep(.panel-links a:hover) { color: var(--color-primary-dark); }
.info-panel__body :deep(.panel-actions) { display: grid; gap: 8px; }
.info-panel__body :deep(.btn) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 8px 12px; font-size: 14px; border-radius: 8px; }
.info-panel__body :deep(.panel-author) { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.info-panel__body :deep(.panel-info li span:last-child) { text-align: right; }
.info-panel:focus-visible, .info-panel-trigger:focus-visible, .info-panel :deep(:is(a, button, [tabindex]):focus-visible) { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.info-panel-enter-active, .info-panel-leave-active { transition: opacity 160ms, transform 160ms var(--ease-out-quint); }
.info-panel-enter-from, .info-panel-leave-to { opacity: 0; transform: translateY(4px); }
@media (prefers-reduced-motion: reduce) { .info-panel-enter-active, .info-panel-leave-active { transition: none; }.info-panel-enter-from, .info-panel-leave-to { transform: none; }.info-panel__body :deep(.btn) { transform: none; transition: none; }.info-panel__body :deep(.btn::after) { animation: none; } }
</style>
