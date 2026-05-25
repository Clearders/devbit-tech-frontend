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
      <div class="comment__actions">
        <button
          v-if="isAuthenticated && user?.id !== comment.author.id"
          class="comment__action-btn"
          @click="openMessagePanel(comment.author.id)"
          title="私信作者" aria-label="私信作者"
        >
          私信
        </button>
        <button v-if="canDelete" class="comment__action-btn comment__action-btn--danger" @click="$emit('delete', comment.id)" title="删除评论" aria-label="删除评论">
          删除
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

const { user, isAuthenticated } = useAuth()
const { formatRelativeTime, openMessagePanel } = useForum()

const time = computed(() => formatRelativeTime(props.comment.createdAt))
</script>
