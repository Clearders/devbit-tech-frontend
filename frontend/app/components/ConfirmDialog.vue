<script setup lang="ts">
const props = withDefaults(defineProps<{ open: boolean; title: string; description: string; busy?: boolean; confirmLabel?: string; error?: string }>(), { confirmLabel: '确认' })
const emit = defineEmits<{ cancel: []; confirm: [] }>()
const dialog = ref<HTMLElement>()
let previous: HTMLElement | null = null
function keyboard(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.stopPropagation(); if (!props.busy) emit('cancel') }
  if (e.key !== 'Tab') return
  const controls = [...(dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
  if (!controls.length) { e.preventDefault(); dialog.value?.focus(); return }
  const first = controls[0]!, last = controls.at(-1)!
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
watch(() => props.open, async open => {
  if (open) { previous = document.activeElement as HTMLElement; await nextTick(); dialog.value?.querySelector<HTMLButtonElement>('button')?.focus() }
  else if (previous?.isConnected) previous.focus()
}, { flush: 'post' })
onBeforeUnmount(() => { if (previous?.isConnected) previous.focus() })
</script>
<template>
  <Teleport to="body"><div v-if="open" class="confirm-overlay" @click.self="!busy && emit('cancel')"><section ref="dialog" class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" tabindex="-1" @keydown="keyboard">
    <h2 id="confirm-title">{{ title }}</h2><p id="confirm-description">{{ description }}</p><p v-if="error" role="alert" class="form-error">{{ error }}</p>
    <div class="confirm-dialog__actions"><button type="button" class="btn btn--outline" :disabled="busy" @click="emit('cancel')">取消</button><button type="button" class="btn btn--primary" :disabled="busy" @click="emit('confirm')">{{ busy ? '正在处理…' : confirmLabel }}</button></div>
  </section></div></Teleport>
</template>
