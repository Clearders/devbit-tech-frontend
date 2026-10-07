<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { createDisclosureMotion } from '~/utils/disclosureMotion'

const props = withDefaults(defineProps<{ title: string; modelValue?: boolean }>(), { modelValue: undefined })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const expanded = ref(false)
const desired = computed(() => props.modelValue ?? expanded.value)
const renderedOpen = ref(desired.value)
const id = useId()
const details = ref<HTMLDetailsElement>()
const summary = ref<HTMLElement>()
const clip = ref<HTMLElement>()
const content = ref<HTMLElement>()
let motion: ReturnType<typeof createDisclosureMotion> | undefined
let resize: ResizeObserver | undefined
let media: MediaQueryList | undefined
function toggle() {
  expanded.value = !desired.value
  emit('update:modelValue', expanded.value)
}
function reduceMotion() { if (media?.matches) motion?.finish() }
watch(desired, open => {
  if (!open && clip.value?.contains(document.activeElement)) summary.value?.focus({ preventScroll: true })
  if (motion) motion.setOpen(open)
  else renderedOpen.value = open
}, { flush: 'sync' })
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', reduceMotion)
  motion = createDisclosureMotion(details.value!, clip.value!, content.value!, {
    rendered: open => { renderedOpen.value = open }, reduced: () => !!media?.matches,
  })
  motion.setOpen(desired.value, false)
  resize = new ResizeObserver(() => motion?.resize())
  resize.observe(content.value!)
})
onBeforeUnmount(() => { resize?.disconnect(); media?.removeEventListener('change', reduceMotion); motion?.dispose() })
</script>

<template>
  <details ref="details" class="page-disclosure" :open="renderedOpen" :data-expanded="desired">
    <summary ref="summary" :aria-expanded="desired" :aria-controls="`${id}-content`" @click.prevent="toggle"><span>{{ title }}</span><ChevronDown :size="18" :stroke-width="1.75" aria-hidden="true" /></summary>
    <div :id="`${id}-content`" ref="clip" class="page-disclosure__clip" :inert="!desired" :aria-hidden="!desired">
      <div ref="content" class="page-disclosure__body"><slot /></div>
    </div>
  </details>
</template>

<style scoped>
.page-disclosure { border-top: 1px solid var(--color-border-light); }
.page-disclosure > summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 12px 0; list-style: none; cursor: pointer; color: var(--color-text-secondary); font-size: 14px; font-weight: 500; }
.page-disclosure > summary::-webkit-details-marker { display: none; }
.page-disclosure > summary svg { flex-shrink: 0; transition: transform 180ms var(--ease-out-quint); }
.page-disclosure[data-expanded='true'] > summary svg { transform: rotate(180deg); }
.page-disclosure > summary:hover { color: var(--color-primary-dark); }
.page-disclosure > summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: 6px; }
.page-disclosure__body { display: flow-root; padding: 4px 0 20px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.8; }
.page-disclosure__body :deep(p + p) { margin-top: 12px; }
@media (prefers-reduced-motion: reduce) { .page-disclosure > summary svg { transition: none; } }
</style>
