<script setup lang="ts">
import { Search, X } from '@lucide/vue'

const props = withDefaults(defineProps<{ modelValue: string; label?: string; placeholder?: string }>(), {
  label: '搜索帖子', placeholder: '搜索帖子标题、内容或标签',
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; composition: [active: boolean] }>()
const input = ref<HTMLInputElement>()
const value = computed({ get: () => props.modelValue, set: (value: string) => emit('update:modelValue', value) })
function focus() { input.value?.focus({ preventScroll: true }) }
function clear() { value.value = ''; focus() }
defineExpose({ focus })
</script>

<template>
  <div class="forum-search">
    <span class="forum-search__icon" data-search-icon><Search :size="18" :stroke-width="1.75" /></span>
    <input ref="input" v-model="value" type="search" class="forum-search__input" data-forum-search
      :aria-label="label" :placeholder="placeholder"
      @compositionstart="emit('composition', true)" @compositionend="emit('composition', false)" />
    <Transition name="forum-search-clear">
      <span v-if="value" class="forum-search__clear-slot">
        <button type="button" class="forum-search__clear" aria-label="清除搜索" data-forum-control @click="clear">
          <span class="forum-control-icon" data-forum-icon><X :size="17" :stroke-width="1.75" /></span>
        </button>
      </span>
    </Transition>
  </div>
</template>
