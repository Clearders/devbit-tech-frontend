<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
defineOptions({ inheritAttrs: false })
defineProps<{ id: string; modelValue: string; label: string; error?: string; hint?: string; autocomplete?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
</script>
<template>
  <div class="form-group">
    <label class="form-label" :for="id">{{ label }}</label>
    <div class="password-field">
      <input :id="id" v-bind="$attrs" :value="modelValue" :type="visible ? 'text' : 'password'" class="form-control" :class="{ 'form-control--error': error }" :autocomplete="autocomplete ?? 'new-password'" :aria-invalid="!!error" :aria-describedby="[hint ? id + '-hint' : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)">
      <button type="button" class="password-field__toggle" :aria-label="visible ? '隐藏' + label : '显示' + label" :aria-pressed="visible" @click="visible = !visible"><component :is="visible ? EyeOff : Eye" :size="19" aria-hidden="true" /></button>
    </div>
    <p v-if="hint" :id="id + '-hint'" class="form-hint">{{ hint }}</p>
    <span v-if="error" :id="id + '-error'" class="form-error">{{ error }}</span>
  </div>
</template>
<style scoped>
.password-field { position: relative; }.password-field input { padding-right: 52px; }.password-field__toggle { position: absolute; top: 2px; right: 3px; display: grid; place-items: center; width: 44px; height: calc(100% - 4px); border: 0; border-radius: 10px; background: transparent; color: var(--color-text-secondary); cursor: pointer; }.form-hint { margin: 8px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }
</style>
