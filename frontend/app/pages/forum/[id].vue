<template>
  <div class="forum-detail" v-if="post">
    <!-- Header -->
    <section class="page-header">
      <div class="container">
        <NuxtLink to="/forum" class="forum-detail__back">← 返回论坛</NuxtLink>
        <div class="forum-detail__header">
          <div class="forum-detail__header-top">
            <span class="forum-detail__category">
              <span>{{ categoryInfo?.icon }}</span>
              {{ categoryInfo?.label }}
            </span>
            <span v-if="post.isPinned" class="forum-detail__badge forum-detail__badge--pin">📌 置顶</span>
            <span v-if="post.isLocked" class="forum-detail__badge forum-detail__badge--lock">🔒 已锁定</span>
          </div>
          <h1 class="forum-detail__title">{{ post.title }}</h1>
          <div class="forum-detail__meta">
            <div class="forum-detail__author">
              <span class="forum-detail__author-avatar">{{ post.author.avatar }}</span>
              <span class="forum-detail__author-name">
                {{ post.author.name }}
                <span v-if="post.author.isAdmin" class="forum-detail__admin-tag">管理员</span>
              </span>
            </div>
            <div class="forum-detail__stats">
              <span>🕐 {{ formatRelativeTime(post.createdAt) }}</span>
              <span v-if="post.updatedAt !== post.createdAt">
                (编辑于 {{ formatRelativeTime(post.updatedAt) }})
              </span>
              <span>👁 {{ formatCount(post.viewCount) }} 浏览</span>
              <span>💬 {{ post.commentCount }} 评论</span>
            </div>
          </div>

          <!-- Admin actions -->
          <div v-if="canManage" class="forum-detail__admin-actions">
            <button
              class="btn btn--sm"
              :class="post.isPinned ? 'btn--warning' : 'btn--outline'"
              @click="handleTogglePin"
            >
              {{ post.isPinned ? '📌 取消置顶' : '📌 置顶' }}
            </button>
            <button
              class="btn btn--sm"
              :class="post.isLocked ? 'btn--warning' : 'btn--outline'"
              @click="handleToggleLock"
            >
              {{ post.isLocked ? '🔓 解锁' : '🔒 锁定' }}
            </button>
            <button class="btn btn--sm btn--danger" @click="handleDeletePost">
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="forum-detail-content">
      <div class="container">
        <div class="forum-detail__layout">
          <!-- Post body -->
          <div class="forum-detail__body">
            <div class="forum-detail__text">{{ post.content }}</div>

            <!-- Tags -->
            <div class="forum-detail__tags" v-if="post.tags.length">
              <span v-for="tag in post.tags" :key="tag" class="forum-detail__tag">{{ tag }}</span>
            </div>

            <!-- Comments section -->
            <div class="forum-detail__comments">
              <h2 class="forum-detail__comments-title">
                💬 评论 ({{ postComments.length }})
                <span v-if="post.isLocked" class="forum-detail__locked-hint">— 帖子已锁定，无法添加新评论</span>
              </h2>

              <!-- Comment list -->
              <div v-if="postComments.length" class="forum-detail__comment-list">
                <ForumComment
                  v-for="comment in postComments"
                  :key="comment.id"
                  :comment="comment"
                  :can-delete="canDeleteComment(comment)"
                  @delete="handleDeleteComment"
                />
              </div>
              <div v-else class="forum-detail__no-comments">
                暂无评论，快来发表第一条评论吧！
              </div>

              <!-- Add comment -->
              <div v-if="!post.isLocked && isAuthenticated" class="forum-detail__add-comment">
                <div class="forum-detail__comment-avatar">{{ userAvatar }}</div>
                <div class="forum-detail__comment-form">
                  <textarea
                    v-model="newComment"
                    class="form-control form-control--textarea"
                    placeholder="写下你的评论…"
                    rows="3"
                    @keydown.ctrl.enter="handleAddComment"
                  ></textarea>
                  <div class="forum-detail__comment-actions">
                    <span class="forum-detail__comment-hint">Ctrl + Enter 发送</span>
                    <button
                      class="btn btn--primary btn--sm"
                      :disabled="!newComment.trim()"
                      @click="handleAddComment"
                    >
                      发表评论
                    </button>
                  </div>
                </div>
              </div>
              <div v-else-if="post.isLocked" class="forum-detail__locked-msg">
                🔒 该帖子已被锁定，无法添加评论
              </div>
              <div v-else class="forum-detail__login-prompt">
                <NuxtLink to="/login" class="btn btn--outline">登录后参与评论</NuxtLink>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <aside class="forum-detail__sidebar">
            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">👤 作者</h3>
              <div class="forum-detail__author-card">
                <span class="forum-detail__author-card-avatar">{{ post.author.avatar }}</span>
                <span class="forum-detail__author-card-name">
                  {{ post.author.name }}
                  <span v-if="post.author.isAdmin" class="forum-detail__admin-tag">管理员</span>
                </span>
              </div>
            </div>

            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">📊 帖子信息</h3>
              <ul class="forum-sidebar-card__info-list">
                <li><span>分类</span><span>{{ categoryInfo?.icon }} {{ categoryInfo?.label }}</span></li>
                <li><span>浏览</span><span>{{ formatCount(post.viewCount) }}</span></li>
                <li><span>评论</span><span>{{ post.commentCount }}</span></li>
                <li><span>发布</span><span>{{ formatRelativeTime(post.createdAt) }}</span></li>
              </ul>
            </div>

            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">🔥 相关帖子</h3>
              <ul class="forum-sidebar-card__hot-list">
                <li v-for="related in relatedPosts" :key="related.id">
                  <NuxtLink :to="`/forum/${related.id}`" class="forum-sidebar-card__hot-link">
                    <span class="forum-sidebar-card__hot-title">{{ related.title }}</span>
                    <span class="forum-sidebar-card__hot-meta">💬 {{ related.commentCount }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  </div>

  <!-- Not found -->
  <div v-else class="forum-detail forum-detail--404">
    <section class="page-header">
      <div class="container" style="text-align: center;">
        <h1 class="page-header__title">😕 帖子未找到</h1>
        <p class="page-header__subtitle">该帖子可能已被删除或不存在。</p>
        <NuxtLink to="/forum" class="btn btn--primary" style="margin-top: 1.5rem;">← 返回论坛</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ForumComment from '~/components/ForumComment.vue'
import { useForum } from '~/composables/useForum'

useSeoMeta({
  title: '帖子详情 – DevBit Tech',
  description: '查看帖子详情与讨论。'
})

const route = useRoute()
const { user, isAuthenticated } = useAuth()
const {
  FORUM_CATEGORIES,
  formatRelativeTime,
  getPostById,
  getCommentsByPostId,
  addComment,
  deletePost,
  deleteComment,
  togglePinPost,
  toggleLockPost,
  posts,
  loadCommentsForPost,
  initFromApi,
} = useForum()

const postId = computed(() => Number(route.params.id))
const post = computed(() => getPostById(postId.value))
const postComments = computed(() => getCommentsByPostId(postId.value))
const newComment = ref('')

// Update SEO title dynamically
watchEffect(() => {
  if (post.value) {
    useSeoMeta({
      title: `${post.value.title} – DevBit Tech 论坛`,
      description: post.value.content.slice(0, 160),
    })
  }
})

const categoryInfo = computed(() =>
  post.value ? FORUM_CATEGORIES.find(c => c.value === post.value!.category) : null
)

const userAvatar = computed(() => '👤')

const canManage = computed(() => {
  if (!post.value || !user.value) return false
  return user.value.id === post.value.author.id || user.value.id === 1 || user.value.id === 2
})

// Load from API on mount and when postId changes
onMounted(() => {
  initFromApi()
  loadCommentsForPost(postId.value)
})
watch(postId, (newId) => {
  if (newId) loadCommentsForPost(newId)
})

function canDeleteComment(comment: { author: { id: number } }) {
  if (!user.value) return false
  return user.value.id === comment.author.id || user.value.id === 1 || user.value.id === 2
}

const relatedPosts = computed(() => {
  if (!post.value) return []
  return posts.value
    .filter(p => p.id !== post.value!.id && p.category === post.value!.category)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 5)
})

function handleAddComment() {
  const text = newComment.value.trim()
  if (!text) return
  addComment(postId.value, text)
  newComment.value = ''
}

function handleDeleteComment(commentId: number) {
  if (confirm('确定要删除该评论吗？')) {
    deleteComment(commentId)
  }
}

function handleTogglePin() {
  togglePinPost(postId.value)
}

function handleToggleLock() {
  toggleLockPost(postId.value)
}

function handleDeletePost() {
  if (confirm('确定要删除该帖子吗？此操作不可撤销。')) {
    deletePost(postId.value)
    navigateTo('/forum')
  }
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>
