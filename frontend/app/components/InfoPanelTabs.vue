<script setup lang="ts">
const props = defineProps<{ items: readonly { id: string; label: string }[]; label: string }>()
const selected = ref(props.items[0]?.id)
const id = useId()
const tabs = ref<HTMLElement>()
function onKey(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? props.items.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + props.items.length) % props.items.length
  selected.value = props.items[next]?.id
  tabs.value?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
}
</script>

<template>
  <div ref="tabs" class="panel-tabs" role="tablist" :aria-label="label">
    <button v-for="(item, index) in items" :id="`${id}-tab-${item.id}`" :key="item.id" type="button" role="tab"
      :aria-selected="selected === item.id" :aria-controls="`${id}-panel-${item.id}`" :tabindex="selected === item.id ? 0 : -1"
      @click="selected = item.id" @keydown="onKey($event, index)">{{ item.label }}</button>
  </div>
  <div v-for="item in items" v-show="selected === item.id" :id="`${id}-panel-${item.id}`" :key="item.id"
    role="tabpanel" :aria-labelledby="`${id}-tab-${item.id}`" tabindex="0"><slot :name="item.id" /></div>
</template>
