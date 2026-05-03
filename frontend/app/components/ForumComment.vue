<template>
  <div class="comment" :id="`comment-${comment.id}`">
    <div class="comment__avatar">{{ comment.author.avatar }}</div>
    <div class="comment__body">
      <div class="comment__header">
        <span class="comment__author">
          {{ comment.author.name }}
          <span v-if="comment.author.isAdmin" class="comment__admin-badge">管理员</span>
        </span>
        <span class="comment__time">{{ time }}</span>
      </div>
      <p class="comment__content">{{ comment.content }}</p>
      <div class="comment__actions" v-if="canDelete">
        <button class="comment__delete-btn" @click="$emit('delete', comment.id)" title="删除评论">
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumComment } from '~/composables/useForum'
import { useForum } from '~/composables/useForum'

const props = defineProps<{
  comment: ForumComment
  canDelete?: boolean
}>()

defineEmits<{
  delete: [id: number]
}>()

const { formatRelativeTime } = useForum()

const time = computed(() => formatRelativeTime(props.comment.createdAt))
</script>
