<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h2 class="admin-panel__title">🛡️ 管理面板</h2>
      <p class="admin-panel__subtitle">管理论坛内容与用户</p>
    </div>
    <div v-if="actionError" class="form-error form-error--global">{{ actionError }}</div>

    <!-- Tabs -->
    <div class="admin-panel__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="admin-panel__tab"
        :class="{ 'admin-panel__tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Posts management -->
    <div v-if="activeTab === 'posts'" class="admin-panel__section">
      <div class="admin-panel__stats">
        <div class="admin-panel__stat">
          <span class="admin-panel__stat-value">{{ allPosts.length }}</span>
          <span class="admin-panel__stat-label">总帖子</span>
        </div>
        <div class="admin-panel__stat">
          <span class="admin-panel__stat-value">{{ allComments.length }}</span>
          <span class="admin-panel__stat-label">总评论</span>
        </div>
        <div class="admin-panel__stat">
          <span class="admin-panel__stat-value">{{ allPosts.filter(p => p.isPinned).length }}</span>
          <span class="admin-panel__stat-label">置顶</span>
        </div>
      </div>

      <table class="admin-panel__table" v-if="allPosts.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>作者</th>
            <th>分类</th>
            <th>评论</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in allPosts" :key="post.id">
            <td class="admin-panel__td-id">{{ post.id }}</td>
            <td>
              <NuxtLink :to="`/forum/${post.id}`" class="admin-panel__post-link">
                {{ post.title.length > 30 ? post.title.slice(0, 30) + '…' : post.title }}
              </NuxtLink>
            </td>
            <td>{{ post.author.name }}</td>
            <td>
              <span class="admin-panel__cat">{{ getCategoryLabel(post.category) }}</span>
            </td>
            <td>{{ post.commentCount }}</td>
            <td class="admin-panel__actions">
              <button
                class="admin-panel__action-btn"
                :title="post.isPinned ? '取消置顶' : '置顶'"
                @click="handleTogglePin(post.id)"
              >
                {{ post.isPinned ? '📌↓' : '📌' }}
              </button>
              <button
                class="admin-panel__action-btn"
                :title="post.isLocked ? '解锁' : '锁定'"
                @click="handleToggleLock(post.id)"
              >
                {{ post.isLocked ? '🔓' : '🔒' }}
              </button>
              <button
                class="admin-panel__action-btn admin-panel__action-btn--danger"
                title="删除"
                @click="handleDeletePost(post.id)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="admin-panel__empty">暂无帖子</div>
    </div>

    <!-- Comments management -->
    <div v-if="activeTab === 'comments'" class="admin-panel__section">
      <table class="admin-panel__table" v-if="allComments.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>内容</th>
            <th>作者</th>
            <th>所属帖子</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="comment in allComments" :key="comment.id">
            <td class="admin-panel__td-id">{{ comment.id }}</td>
            <td>
              <span class="admin-panel__comment-text">
                {{ comment.content.length > 50 ? comment.content.slice(0, 50) + '…' : comment.content }}
              </span>
            </td>
            <td>{{ comment.author.name }}</td>
            <td>
              <NuxtLink :to="`/forum/${comment.postId}`" class="admin-panel__post-link">
                帖子 #{{ comment.postId }}
              </NuxtLink>
            </td>
            <td>
              <button
                class="admin-panel__action-btn admin-panel__action-btn--danger"
                title="删除"
                @click="handleDeleteComment(comment.id)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="admin-panel__empty">暂无评论</div>
    </div>

    <!-- Users management -->
    <div v-if="activeTab === 'users'" class="admin-panel__section">
      <table class="admin-panel__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>头像</th>
            <th>用户名</th>
            <th>角色</th>
            <th>帖子数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="admin-panel__td-id">{{ u.id }}</td>
            <td>
              <AvatarImage
                :avatar-url="u.avatarUrl"
                :avatar="u.avatar"
                :name="u.name"
                size="sm"
              />
            </td>
            <td>{{ u.name }}</td>
            <td>
              <span class="admin-panel__role" :class="{ 'admin-panel__role--admin': u.isAdmin }">
                {{ u.isAdmin ? '管理员' : '普通用户' }}
              </span>
            </td>
            <td>{{ allPosts.filter(p => p.author.id === u.id).length }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumCategory } from '~~/shared/forum'
import AvatarImage from '~/components/AvatarImage.vue'
import { useForum } from '~/composables/useForum'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { getForumCategory } from '~/utils/forum'

const { posts, comments, users, deletePost, deleteComment, togglePinPost, toggleLockPost } = useForum()

const activeTab = ref<'posts' | 'comments' | 'users'>('posts')
const actionError = ref('')
const tabs = [
  { key: 'posts' as const, label: '📝 帖子管理' },
  { key: 'comments' as const, label: '💬 评论管理' },
  { key: 'users' as const, label: '👥 用户管理' },
]

const allPosts = computed(() =>
  [...posts.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

const allComments = computed(() =>
  [...comments.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

function getCategoryLabel(cat: ForumCategory) {
  return getForumCategory(cat)?.label ?? cat
}

async function runAction(action: () => Promise<unknown>, fallback: string) {
  actionError.value = ''
  try {
    await action()
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, fallback)
  }
}

function handleDeletePost(id: number) {
  if (confirm('确定要删除该帖子吗？此操作不可撤销。')) {
    void runAction(() => deletePost(id), '删除帖子失败，请稍后重试。')
  }
}

function handleDeleteComment(id: number) {
  if (confirm('确定要删除该评论吗？')) {
    void runAction(() => deleteComment(id), '删除评论失败，请稍后重试。')
  }
}

function handleTogglePin(id: number) {
  void runAction(() => togglePinPost(id), '更新置顶状态失败，请稍后重试。')
}

function handleToggleLock(id: number) {
  void runAction(() => toggleLockPost(id), '更新锁定状态失败，请稍后重试。')
}
</script>
