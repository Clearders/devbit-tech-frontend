<template>
  <div
    class="avatar-image"
    :class="{
      'avatar-image--clickable': clickable,
      [`avatar-image--${size}`]: true,
    }"
    :title="name"
    @click="clickable && $emit('click')"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="`${name} 的头像`"
      class="avatar-image__img"
      @error="onImageError"
    />
    <span v-else class="avatar-image__fallback">{{ avatar }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  avatarUrl?: string | null
  avatar: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
}>(), {
  size: 'md',
  clickable: false,
})

defineEmits<{
  click: []
}>()

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const fallback = img.nextElementSibling as HTMLElement | null
  if (fallback) {
    fallback.style.display = ''
  }
}
</script>

<style scoped>
.avatar-image {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-2, #e8e5e0);
  flex-shrink: 0;
  user-select: none;
}

.avatar-image--sm {
  width: 32px;
  height: 32px;
  font-size: 0.75rem;
}

.avatar-image--md {
  width: 44px;
  height: 44px;
  font-size: 1rem;
}

.avatar-image--lg {
  width: 72px;
  height: 72px;
  font-size: 1.5rem;
}

.avatar-image--clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-image--clickable:hover {
  transform: scale(1.08);
  box-shadow: 0 0 0 3px var(--color-primary, #6c5ce7);
}

.avatar-image__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-image__fallback {
  font-weight: 600;
  color: var(--color-text-muted, #888);
}
</style>
