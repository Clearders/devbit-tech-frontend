<template>
  <div class="forum-page">
    <!-- Header -->
    <section class="page-header">
      <div class="container">
        <p class="hero__badge">Community</p>
        <h1 class="page-header__title">💬 论坛</h1>
        <p class="page-header__subtitle">
          技术讨论、经验分享、问题解答——一切尽在 DevBit Tech 论坛。
        </p>
      </div>
    </section>

    <!-- Toolbar -->
    <section class="forum-toolbar">
      <div class="container">
        <div class="forum-toolbar__row">
          <!-- Search -->
          <div class="forum-toolbar__search">
            <span class="forum-toolbar__search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              class="form-control forum-toolbar__search-input"
              placeholder="搜索帖子标题、内容或标签"
              @input="onSearchInput"
            />
            <button v-if="searchQuery" class="forum-toolbar__search-clear" @click="clearSearch">✖</button>
          </div>

          <!-- Actions -->
          <div class="forum-toolbar__actions">
            <label class="forum-toolbar__sort" for="forum-sort">
              <span>排序</span>
              <select id="forum-sort" v-model="sortMode" class="form-control forum-toolbar__sort-select">
                <option value="latest">最新发布</option>
                <option value="active">讨论最多</option>
                <option value="views">浏览最多</option>
                <option value="likes">点赞最多</option>
              </select>
            </label>
            <button v-if="isAuthenticated" class="btn btn--primary" @click="showCreateModal = true">
              ✏️ 发布帖子
            </button>
            <button
              v-if="isAdmin"
              class="btn btn--outline"
              :class="{ 'btn--active': showAdminPanel }"
              @click="showAdminPanel = !showAdminPanel"
            >
              🛡️ 管理
            </button>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="forum-categories">
          <button
            v-for="cat in categoryTabs"
            :key="cat.value"
            class="forum-categories__tab"
            :class="{ 'forum-categories__tab--active': activeCategory === cat.value }"
            @click="activeCategory = cat.value"
          >
            <span class="forum-categories__tab-icon">{{ cat.icon }}</span>
            <span class="forum-categories__tab-label">{{ cat.label }}</span>
            <span class="forum-categories__tab-count">{{ getCategoryCount(cat.value) }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Main content -->
    <section class="forum-content">
      <div class="container">
        <div class="forum-layout">
          <!-- Left: Post list -->
          <div class="forum-layout__main">
            <!-- Admin Panel -->
            <ForumAdminPanel v-if="showAdminPanel && isAdmin" />

            <div v-if="loadError" class="forum-status forum-status--error">        <span>{{ loadError }}</span>
              <button class="btn btn--outline btn--sm" @click="loadForum(true)">重试</button>
            </div>

            <div class="forum-results-bar">
              <span>{{ resultSummary }}</span>
              <NuxtLink v-if="!isAuthenticated" to="/login" class="forum-results-bar__link">登录后发帖和评论</NuxtLink>
            </div>

            <div v-if="isLoadingForum" class="forum-empty">
              <div class="forum-empty__icon">⏳</div>
              <h3 class="forum-empty__title">正在加载论坛</h3>
              <p class="forum-empty__desc">正在获取最新帖子和社区数据。</p>
            </div>

            <!-- Empty state -->
            <div v-else-if="displayedPosts.length === 0" class="forum-empty">
              <div class="forum-empty__icon">{{ searchQuery ? '🔍' : '📝' }}</div>
              <h3 class="forum-empty__title">
                {{ searchQuery ? '未找到匹配的帖子' : '暂无帖子' }}
              </h3>
              <p class="forum-empty__desc">
                {{ searchQuery ? '尝试其他关键词或浏览不同分类' : '成为第一个发帖的人吧！' }}
              </p>
              <button
                v-if="!searchQuery && isAuthenticated"
                class="btn btn--primary"
                @click="showCreateModal = true"
              >
                发布第一个帖子
              </button>
            </div>

            <!-- Post list -->
            <div v-else class="forum-post-list">
              <ForumPostCard
                v-for="post in displayedPosts"
                :key="post.id"
                :post="post"
              />
            </div>
          </div>

          <!-- Right: Sidebar -->
          <aside class="forum-layout__sidebar">
            <!-- Stats -->
            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">📊 社区统计</h3>
              <div class="forum-sidebar-card__stats">
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ totalPostCount }}</span>
                  <span class="forum-sidebar-card__stat-label">帖子</span>
                </div>
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ totalCommentCount }}</span>
                  <span class="forum-sidebar-card__stat-label">评论</span>
                </div>
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ DEMO_USERS.length }}</span>
                  <span class="forum-sidebar-card__stat-label">用户</span>
                </div>
              </div>
            </div>

            <!-- Hot posts -->
            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">🔥 热门帖子</h3>
              <ul class="forum-sidebar-card__hot-list">
                <li v-for="post in hotPosts" :key="post.id">
                  <NuxtLink :to="`/forum/${post.id}`" class="forum-sidebar-card__hot-link">
                    <span class="forum-sidebar-card__hot-title">{{ post.title }}</span>
                    <span class="forum-sidebar-card__hot-meta">💬 {{ post.commentCount }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Guidelines -->
            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">📋 社区规范</h3>
              <ul class="forum-sidebar-card__rules">
                <li>尊重他人，友善交流</li>
                <li>禁止发布广告与垃圾信息</li>
                <li>技术讨论请保持客观</li>
                <li>求助时请描述清楚问题</li>
                <li>转载内容请注明出处</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- Create Post Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal">
          <div class="modal__header">
            <h2 class="modal__title">✏️ 发布新帖子</h2>
            <button class="modal__close" @click="closeCreateModal">✖</button>
          </div>
          <form class="modal__body" @submit.prevent="handleCreatePost">
            <div v-if="createApiError" class="form-error form-error--global">{{ createApiError }}</div>
            <div class="form-group">
              <label class="form-label" for="new-title">标题</label>
              <input
                id="new-title"
                v-model="newPost.title"
                type="text"
                class="form-control"
                :class="{ 'form-control--error': createErrors.title }"
                placeholder="输入帖子标题"
                maxlength="100"
              />
              <span v-if="createErrors.title" class="form-error">{{ createErrors.title }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-category">分类</label>
              <select
                id="new-category"
                v-model="newPost.category"
                class="form-control"
              >
                <option v-for="cat in FORUM_CATEGORIES" :key="cat.value" :value="cat.value">
                  {{ cat.icon }} {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-content">内容</label>
              <textarea
                id="new-content"
                v-model="newPost.content"
                class="form-control form-control--textarea"
                :class="{ 'form-control--error': createErrors.content }"
                placeholder="分享你的想法…（支持 Markdown）"
                rows="8"
              ></textarea>
              <span v-if="createErrors.content" class="form-error">{{ createErrors.content }}</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-tags">标签（逗号分隔）</label>
              <input
                id="new-tags"
                v-model="newPost.tagsInput"
                type="text"
                class="form-control"
                placeholder="例如：Rust, 前端, 教程"
              />
            </div>

            <div class="modal__actions">
              <button type="button" class="btn btn--outline" @click="closeCreateModal">取消</button>
              <button type="submit" class="btn btn--primary" :disabled="creatingPost">
                {{ creatingPost ? '发布中...' : '发布' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ForumCategory } from '~/composables/useForum'
import type { CreatePostPayload } from '~~/shared/forum'
import { useForum } from '~/composables/useForum'
import ForumPostCard from '~/components/ForumPostCard.vue'
import ForumAdminPanel from '~/components/ForumAdminPanel.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

useSeoMeta({
  title: '论坛 — DevBit Tech',
  description: '参与技术讨论，分享经验，提问解答。'
})

const { user, isAuthenticated } = useAuth()
const {
  posts,
  comments,
  FORUM_CATEGORIES,
  DEMO_USERS,
  getPostsByCategory,
  localSearchPosts,
  createPost,
  initFromApi,
} = useForum()

const isLoadingForum = ref(true)
const loadError = ref('')

async function loadForum(force = false) {
  isLoadingForum.value = true
  loadError.value = ''
  try {
    await initFromApi(force)
  } catch (error: unknown) {
    loadError.value = extractApiErrorMessage(error, '论坛数据加载失败，请稍后重试。')
  } finally {
    isLoadingForum.value = false
  }
}

onMounted(() => {
  void loadForum()
})

// Category tabs (prepend "all")
const categoryTabs = computed(() => [
  { value: 'all' as const, label: '全部', icon: '🌐' },
  ...FORUM_CATEGORIES.map((c: typeof FORUM_CATEGORIES[number]) => ({ value: c.value, label: c.label, icon: c.icon })),
])

const totalPostCount = computed(() => posts.value.length)
const totalCommentCount = computed(() => comments.value.length)

const isAdmin = computed(() => !!user.value?.isAdmin)

// Search & filter
const searchQuery = ref('')
const activeCategory = ref<ForumCategory | 'all'>('all')
const sortMode = ref<'latest' | 'active' | 'views' | 'likes'>('latest')
const showAdminPanel = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const hotPosts = computed(() =>
  [...posts.value]
    .sort((a, b) => b.commentCount - a.commentCount || b.viewCount - a.viewCount)
    .slice(0, 5)
)

const filteredPosts = computed(() => {
  if (searchQuery.value.trim()) {
    const results = localSearchPosts(searchQuery.value)
    if (activeCategory.value !== 'all') {
      return results.filter((p: typeof results[number]) => p.category === activeCategory.value)
    }
    return results
  }
  return getPostsByCategory(activeCategory.value === 'all' ? undefined : activeCategory.value)
})

const displayedPosts = computed(() => {
  const sorted = [...filteredPosts.value]
  return sorted.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (sortMode.value === 'active') return b.commentCount - a.commentCount || newestFirst(a, b)
    if (sortMode.value === 'views') return b.viewCount - a.viewCount || newestFirst(a, b)
    if (sortMode.value === 'likes') return b.likeCount - a.likeCount || newestFirst(a, b)
    return newestFirst(a, b)
  })
})

const resultSummary = computed(() => {
  const scope = activeCategory.value === 'all'
    ? '全部分类'
    : categoryTabs.value.find(cat => cat.value === activeCategory.value)?.label ?? '当前分类'
  const query = searchQuery.value.trim()
  return query
    ? `${scope}中找到 ${displayedPosts.value.length} 个匹配结果`
    : `${scope}共 ${displayedPosts.value.length} 个帖子`
})

function newestFirst(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function getCategoryCount(category: ForumCategory | 'all') {
  if (category === 'all') return totalPostCount.value
  return posts.value.filter(post => post.category === category).length
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { /* reactive, no-op */ }, 300)
}

function clearSearch() {
  searchQuery.value = ''
}

// Create post modal
const showCreateModal = ref(false)
const creatingPost = ref(false)
const createApiError = ref('')
const newPost = reactive({
  title: '',
  content: '',
  category: 'general' as ForumCategory,
  tagsInput: '',
})
const createErrors = reactive({ title: '', content: '' })

function closeCreateModal() {
  showCreateModal.value = false
  newPost.title = ''
  newPost.content = ''
  newPost.category = 'general'
  newPost.tagsInput = ''
  createErrors.title = ''
  createErrors.content = ''
  createApiError.value = ''
}

async function handleCreatePost() {
  createErrors.title = ''
  createErrors.content = ''
  createApiError.value = ''
  let valid = true

  if (!newPost.title.trim()) {
    createErrors.title = '请输入标题'
    valid = false
  }
  if (!newPost.content.trim()) {
    createErrors.content = '请输入内容'
    valid = false
  }

  if (!valid) return

  const tags = newPost.tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  creatingPost.value = true
  try {
    await createPost({
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      category: newPost.category,
      tags,
    })
    closeCreateModal()
    await navigateTo('/forum')
  } catch (error: unknown) {
    createApiError.value = extractApiErrorMessage(error, '发布失败，请稍后重试。')
  } finally {
    creatingPost.value = false
  }
}
</script>
