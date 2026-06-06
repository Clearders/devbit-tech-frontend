<template>
  <div v-if="isLoadingPost" class="forum-detail forum-detail--loading">
    <section class="page-header">
      <div class="container">
        <NuxtLink to="/forum" class="forum-detail__back">← 返回论坛</NuxtLink>
        <!-- Skeleton detail view -->
        <div class="skeleton skeleton--title" style="width: 35%; margin-bottom: 1rem;"></div>
        <div class="skeleton skeleton--title" style="width: 75%; height: 2rem; margin-bottom: 1.5rem;"></div>
        <div class="skeleton skeleton--text" style="width: 50%; margin-bottom: 0.75rem;"></div>
        <div class="skeleton-card" style="margin-top: 1rem;">
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text" style="width: 90%;"></div>
          <div class="skeleton skeleton--text" style="width: 70%;"></div>
          <div class="skeleton skeleton--text" style="width: 85%;"></div>
          <div class="skeleton skeleton--text" style="width: 50%;"></div>
        </div>
        <!-- Skeleton comments -->
        <div style="margin-top: 2rem;">
          <div class="skeleton skeleton--title" style="width: 25%; margin-bottom: 1rem;"></div>
          <div v-for="n in 3" :key="'skel-c-'+n" class="skeleton-comment">
            <div class="skeleton skeleton--avatar"></div>
            <div class="skeleton-comment__body">
              <div class="skeleton skeleton--text-sm" style="width: 20%;"></div>
              <div class="skeleton skeleton--text"></div>
              <div class="skeleton skeleton--text" style="width: 60%;"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="forum-detail" v-else-if="post">
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
              <AvatarImage
                :avatar-url="post.author.avatarUrl"
                :avatar="post.author.avatar"
                :name="post.author.name"
                size="md"
              />
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
              <span>👍 {{ post.likeCount }} 赞</span>
              <span>💬 {{ post.commentCount }} 评论</span>
            </div>
          </div>

          <!-- Admin actions -->
          <div v-if="canDeletePost || isAdmin" class="forum-detail__admin-actions">
            <button
              v-if="isAdmin"
              class="btn btn--sm"
              :class="post.isPinned ? 'btn--warning' : 'btn--outline'"
              @click="handleTogglePin"
            >
              {{ post.isPinned ? '📌 取消置顶' : '📌 置顶' }}
            </button>
            <button
              v-if="isAdmin"
              class="btn btn--sm"
              :class="post.isLocked ? 'btn--warning' : 'btn--outline'"
              @click="handleToggleLock"
            >
              {{ post.isLocked ? '🔓 解锁' : '🔒 锁定' }}
            </button>
            <NuxtLink v-if="canEditPost" :to="`/forum/edit/${post.id}`" class="btn btn--sm btn--outline">
              ✏️ 编辑
            </NuxtLink>
            <button v-if="canDeletePost" class="btn btn--sm btn--danger" @click="handleDeletePost">
              🗑️ 删除
            </button>
          </div>
          <div v-if="actionError" class="form-error form-error--global">{{ actionError }}</div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="forum-detail-content">
      <div class="container">
        <div class="forum-detail__layout">
          <!-- Post body -->
          <div class="forum-detail__body">
            <div class="forum-detail__text">
              <MarkdownRenderer :content="post.content" />
            </div>

            <!-- Tags -->
            <div class="forum-detail__tags" v-if="post.tags.length">
              <span v-for="tag in post.tags" :key="tag" class="forum-detail__tag">{{ tag }}</span>
            </div>

            <!-- Like action -->
            <div class="forum-detail__actions">
              <button
                class="btn btn--lg forum-detail__like-btn"
                :class="post.likedByMe ? 'btn--primary' : 'btn--outline'"
                @click="handleLike"
                :disabled="!isAuthenticated"
                :title="!isAuthenticated ? '请先登录' : ''"
              >
                👍 点赞 ({{ post.likeCount }})
              </button>
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
                <div class="forum-detail__comment-avatar">
                  <AvatarImage
                    :avatar-url="user?.avatarUrl"
                    :avatar="userAvatarFallback"
                    :name="user?.name ?? ''"
                    size="sm"
                  />
                </div>
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
                      :disabled="submittingComment || !newComment.trim()"
                      @click="handleAddComment"
                    >
                      {{ submittingComment ? '发表中...' : '发表评论' }}
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
                <AvatarImage
                  :avatar-url="post.author.avatarUrl"
                  :avatar="post.author.avatar"
                  :name="post.author.name"
                  size="md"
                />
                <span class="forum-detail__author-card-name">
                  {{ post.author.name }}
                  <span v-if="post.author.isAdmin" class="forum-detail__admin-tag">管理员</span>
                </span>
                <button
                  v-if="isAuthenticated && user?.id !== post.author.id"
                  class="btn btn--outline btn--sm"
                  style="margin-top: 0.5rem; width: 100%;"
                  @click="openMessagePanel(post.author.id)"
                >
                  💬 发送私信
                </button>
              </div>
            </div>

            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">📊 帖子信息</h3>
              <ul class="forum-sidebar-card__info-list">
                <li><span>分类</span><span>{{ categoryInfo?.icon }} {{ categoryInfo?.label }}</span></li>
                <li><span>浏览</span><span>{{ formatCount(post.viewCount) }}</span></li>
                <li><span>点赞</span><span>{{ post.likeCount }}</span></li>
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
        <p class="page-header__subtitle">{{ actionError || '该帖子可能已被删除或不存在。' }}</p>
        <NuxtLink to="/forum" class="btn btn--primary" style="margin-top: 1.5rem;">← 返回论坛</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ForumComment from '~/components/ForumComment.vue'
import AvatarImage from '~/components/AvatarImage.vue'
import { useForum } from '~/composables/useForum'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

// Update title and description dynamically
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
  toggleLikePost,
  posts,
  ensureInit,
  loadPost,
  loadCommentsForPost,
  openMessagePanel
} = useForum()

const postId = computed(() => Number(route.params.id))
const post = computed(() => getPostById(postId.value))
const postComments = computed(() => getCommentsByPostId(postId.value))
const newComment = ref('')
const actionError = ref('')
const isLoadingPost = ref(true)
const submittingComment = ref(false)

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

const userAvatarFallback = computed(() => {
  const name = user.value?.name ?? ''
  const upper = name.replace(/[^A-Z]/g, '').slice(0, 2)
  if (upper.length >= 2) return upper
  if (upper.length === 1) {
    const lower = name.replace(/[^a-z]/g, '')
    return upper + (lower[0]?.toUpperCase() ?? '')
  }
  return name.slice(0, 2).toUpperCase() || '👤'
})

const isAdmin = computed(() => !!user.value?.isAdmin)
const canDeletePost = computed(() => {
  if (!post.value || !user.value) return false
  return user.value.id === post.value.author.id || user.value.isAdmin
})
const canEditPost = computed(() => {
  if (!post.value || !user.value) return false
  return user.value.id === post.value.author.id || user.value.isAdmin
})

async function loadCurrentPost(id: number) {
  actionError.value = ''
  if (!Number.isFinite(id) || id < 1) {
    isLoadingPost.value = false
    actionError.value = '帖子地址无效。'
    return
  }

  isLoadingPost.value = true
  try {
    await ensureInit()
    await loadPost(id)
    await loadCommentsForPost(id)
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '帖子加载失败，请稍后重试。')
  } finally {
    isLoadingPost.value = false
  }
}

watch(postId, (newId) => {
  void loadCurrentPost(newId)
}, { immediate: true })

function canDeleteComment(comment: { author: { id: number } }) {
  if (!user.value) return false
  return user.value.id === comment.author.id || user.value.isAdmin
}

const relatedPosts = computed(() => {
  if (!post.value) return []
  return posts.value
    .filter(p => p.id !== post.value!.id && p.category === post.value!.category)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 5)
})

async function runAction(action: () => Promise<unknown>, fallback: string) {
  actionError.value = ''
  try {
    await action()
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, fallback)
  }
}

async function handleAddComment() {
  const text = newComment.value.trim()
  if (!text || submittingComment.value) return
  submittingComment.value = true
  await runAction(async () => {
    await addComment(postId.value, text)
    newComment.value = ''
  }, '发表评论失败，请稍后重试。')
  submittingComment.value = false
}

function handleDeleteComment(commentId: number) {
  if (confirm('确定要删除该评论吗？')) {
    void runAction(() => deleteComment(commentId), '删除评论失败，请稍后重试。')
  }
}

function handleTogglePin() {
  void runAction(() => togglePinPost(postId.value), '更新置顶状态失败，请稍后重试。')
}

function handleToggleLock() {
  void runAction(() => toggleLockPost(postId.value), '更新锁定状态失败，请稍后重试。')
}

function handleDeletePost() {
  if (confirm('确定要删除该帖子吗？此操作不可撤销。')) {
    void runAction(async () => {
      await deletePost(postId.value)
      await navigateTo('/forum')
    }, '删除帖子失败，请稍后重试。')
  }
}

function handleLike() {
  if (!isAuthenticated.value) return
  void runAction(() => toggleLikePost(postId.value), '点赞失败，请稍后重试。')
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>
