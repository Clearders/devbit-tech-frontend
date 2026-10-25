<template>
  <div class="comment-thread" :class="{ 'comment-thread--nested': depth > 0 }">
    <div class="comment" :id="`comment-${comment.id}`">
      <div class="comment__avatar">
        <AvatarImage
          :avatar-url="comment.author.avatarUrl"
          :avatar="comment.author.avatar"
          :name="comment.author.name"
          size="sm"
        />
      </div>
      <div class="comment__body">
        <div class="comment__header">
          <span class="comment__author">
            <span class="comment__author-name">{{ comment.author.name }}</span>
            <span v-if="comment.author.isAdmin" class="comment__admin-badge">管理员</span>
          </span>
          <span v-if="comment.replyTo" class="comment__reply-to">
            回复 <strong>@{{ comment.replyTo.name }}</strong>
          </span>
          <span class="comment__time">{{ time }}</span>
        </div>
        <div class="comment__content">
          <MarkdownRenderer :content="comment.content" />
        </div>
        <div class="comment__actions">
          <button
            v-if="isAuthenticated"
            class="comment__action-btn"
            @click="$emit('reply', comment)"
            title="回复这条评论" aria-label="回复这条评论"
          >
            <Reply class="comment__action-icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
            回复
          </button>
          <button
            v-if="isAuthenticated && user?.id !== comment.author.id"
            class="comment__action-btn"
            @click="openMessagePanel(comment.author.id)"
            title="私信作者" aria-label="私信作者"
          >
            <MessageSquare class="comment__action-icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
            私信
          </button>
          <button v-if="canRemove(comment)" class="comment__action-btn comment__action-btn--danger" @click="$emit('delete', comment.id)" title="删除评论" aria-label="删除评论">
            删除
          </button>
        </div>
      </div>
    </div>
    <div v-if="comment.replies?.length" class="comment__replies">
      <ForumComment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :depth="depth + 1"
        @delete="$emit('delete', $event)"
        @reply="$emit('reply', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const formatRelativeTime = useRelativeTime()
import type { ForumComment } from '~~/shared/forum'
import { MessageSquare, Reply } from '@lucide/vue'
import AvatarImage from '~/components/AvatarImage.vue'
import { useForum } from '~/composables/useForum'

const props = withDefaults(defineProps<{
  comment: ForumComment
  canDelete?: boolean
  depth?: number
}>(), { depth: 0 })

defineEmits<{
  delete: [id: number]
  reply: [comment: ForumComment]
}>()

const { user, isAuthenticated } = useAuth()
const { openMessagePanel } = useForum()

const time = computed(() => formatRelativeTime(props.comment.createdAt))
function canRemove(comment: ForumComment) {
  if (!user.value) return false
  return user.value.id === comment.author.id || !!user.value.isAdmin
}
</script>

<style scoped>
.comment-thread--nested {
  margin-left: 2.25rem;
}

@media (max-width: 767.98px) {
  .comment-thread--nested {
    margin-left: 1.25rem;
  }
}

.comment__replies {
  margin-top: 0.35rem;
  border-left: 1px solid var(--color-border, #e5e2dd);
  padding-left: 0.9rem;
}

.comment__reply-to {
  margin-right: auto;
  color: var(--color-text-muted, #6c6c7c);
  font-size: 0.82rem;
}

.comment__reply-to strong {
  color: var(--color-accent, #315fb9);
  font-weight: 500;
}
</style>
