<template>
  <div class="forum-page">
    <!-- Header -->
    <section class="page-header">
      <div class="container" data-transition-group="title">
        <p class="hero__badge" data-transition-group="title">Community</p>
        <h1 class="page-header__title">💬 论坛</h1>
        <p class="page-header__subtitle">
          技术讨论、经验分享、问题解答——一切尽在 DevBit Tech 论坛。
        </p>
      </div>
    </section>

    <!-- Toolbar -->
    <section class="forum-toolbar" data-transition-group="content">
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
            />
            <button
              v-if="searchQuery"
              class="forum-toolbar__search-clear"
              @click="clearSearch"
            >
              ✖
            </button>
          </div>

          <!-- Actions -->
          <div class="forum-toolbar__actions">
            <div class="forum-sort">
              <span class="forum-sort__label">
                <span class="forum-sort__label-icon">↕</span>
                <span class="forum-sort__label-text">排序</span>
              </span>
              <div class="forum-sort__options">
                <button
                  v-for="opt in sortOptions"
                  :key="opt.value"
                  class="forum-sort__btn"
                  :class="{ 'forum-sort__btn--active': sortMode === opt.value }"
                  @click="sortMode = opt.value"
                >
                  <span class="forum-sort__btn-icon">{{ opt.icon }}</span>
                  <span class="forum-sort__btn-text">{{ opt.label }}</span>
                </button>
              </div>
            </div>
            <NuxtLink
              v-if="isAuthenticated"
              to="/forum/new"
              class="btn btn--primary"
            >
              ✏️ 发布帖子
            </NuxtLink>
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
        <div class="forum-category-nav" role="group" aria-label="帖子分类" data-transition-group="content">
          <button type="button" class="forum-category-nav__arrow" aria-label="查看前面的分类" aria-controls="forum-category-list"
            :disabled="!categoryScroll.before" :class="{ 'is-pressed': pressedCategoryArrow === -1 }"
            @pointerenter="setCategoryArrowOrigin" @pointerdown="pressCategoryArrow($event, -1)"
            @pointermove="trackCategoryArrowPointer" @pointerleave="leaveCategoryArrow"
            @pointerup="pressedCategoryArrow = null" @pointercancel="pressedCategoryArrow = null"
            @focus="centerCategoryArrowOrigin" @click="scrollCategories(-1)"><span aria-hidden="true">‹</span></button>
        <div class="forum-category-window" :class="{ 'has-before': categoryScroll.before, 'has-after': categoryScroll.after }">
        <div id="forum-category-list" ref="categoryList" class="forum-categories" @scroll.passive="updateCategoryScroll">
          <button
            v-for="cat in categoryTabs"
            :key="cat.value"
            type="button"
            :aria-pressed="activeCategory === cat.value"
            class="forum-categories__tab"
            :class="{
              'forum-categories__tab--active': activeCategory === cat.value,
            }"
            @click="activeCategory = cat.value"
          >
            <span class="forum-categories__tab-icon">{{ cat.icon }}</span>
            <span class="forum-categories__tab-label">{{ cat.label }}</span>
            <span class="forum-categories__tab-count">{{
              getCategoryCount(cat.value)
            }}</span>
          </button>
        </div>
        </div>
          <button type="button" class="forum-category-nav__arrow" aria-label="查看后面的分类" aria-controls="forum-category-list"
            :disabled="!categoryScroll.after" :class="{ 'is-pressed': pressedCategoryArrow === 1 }"
            @pointerenter="setCategoryArrowOrigin" @pointerdown="pressCategoryArrow($event, 1)"
            @pointermove="trackCategoryArrowPointer" @pointerleave="leaveCategoryArrow"
            @pointerup="pressedCategoryArrow = null" @pointercancel="pressedCategoryArrow = null"
            @focus="centerCategoryArrowOrigin" @click="scrollCategories(1)"><span aria-hidden="true">›</span></button>
        </div>
      </div>
    </section>

    <!-- Main content -->
    <section class="forum-content">
      <div class="container">
        <div class="forum-layout">
          <ForumCommunityPanel :post-count="totalPostCount" :comment-count="totalCommentCount"
            :user-count="users.length" :hot-posts="hotPosts" :loading="isLoadingForum" :error="loadError"
            @retry="loadForum(true)" />
          <!-- Left: Post list -->
          <div class="forum-layout__main">
            <!-- Admin Panel -->
            <ForumAdminPanel v-if="showAdminPanel && isAdmin" />

            <div v-if="loadError" class="forum-status forum-status--error">
              <span>{{ loadError }}</span>
              <button class="btn btn--outline btn--sm" @click="loadForum(true)">
                重试
              </button>
            </div>

            <div v-if="!loadError" class="forum-results-bar" data-transition-group="content">
              <span>{{ resultSummary }}</span>
              <button
                v-if="hasFilters"
                type="button"
                class="btn btn--outline btn--sm"
                @click="clearFilters"
              >
                清除筛选
              </button>
              <NuxtLink
                v-if="!isAuthenticated"
                to="/login"
                class="forum-results-bar__link"
                >登录后发帖和评论</NuxtLink
              >
            </div>

            <div v-if="isLoadingForum" class="forum-post-list">
              <!-- Skeleton loading cards -->
              <div v-for="n in 5" :key="'skel-' + n" class="skeleton-card" data-transition-group="card">
                <div class="skeleton-card__header">
                  <div class="skeleton skeleton--avatar"></div>
                  <div
                    class="skeleton skeleton--text-sm"
                    style="width: 30%"
                  ></div>
                </div>
                <div class="skeleton-card__body">
                  <div
                    class="skeleton skeleton--title"
                    style="width: 70%"
                  ></div>
                  <div class="skeleton skeleton--text"></div>
                  <div class="skeleton skeleton--text" style="width: 60%"></div>
                </div>
                <div class="skeleton-card__footer">
                  <div
                    class="skeleton skeleton--text-sm"
                    style="width: 25%"
                  ></div>
                  <div
                    class="skeleton skeleton--text-sm"
                    style="width: 20%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div
              v-else-if="!loadError && displayedPosts.length === 0"
              class="forum-empty"
            >
              <div class="forum-empty__icon">
                {{ searchQuery ? '🔍' : '📝' }}
              </div>
              <h3 class="forum-empty__title">
                {{ searchQuery ? '未找到匹配的帖子' : '暂无帖子' }}
              </h3>
              <p class="forum-empty__desc">
                {{
                  searchQuery
                    ? '尝试其他关键词或浏览不同分类'
                    : '成为第一个发帖的人吧！'
                }}
              </p>
              <NuxtLink
                v-if="!searchQuery && isAuthenticated"
                to="/forum/new"
                class="btn btn--primary"
              >
                发布第一个帖子
              </NuxtLink>
            </div>

            <!-- Post list -->
            <div v-else-if="!loadError" class="forum-post-list">
              <ForumPostCard data-transition-group="card"
                v-for="post in displayedPosts"
                :key="post.id"
                :post="post"
              />
            </div>
          </div>


        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ForumCategory } from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'
import { useForum } from '~/composables/useForum'
import ForumPostCard from '~/components/ForumPostCard.vue'
import ForumAdminPanel from '~/components/ForumAdminPanel.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

useSeoMeta({
  title: '论坛 — DevBit Tech',
  description: '参与技术讨论，分享经验，提问解答。',
})

const { user, isAuthenticated } = useAuth()
const {
  posts,
  comments,
  users,
  getPostsByCategory,
  localSearchPosts,
  ensureInit,
} = useForum()

const isLoadingForum = ref(true)
const loadError = ref('')

async function loadForum(force = false) {
  isLoadingForum.value = true
  loadError.value = ''
  try {
    await ensureInit(force)
  } catch (error: unknown) {
    loadError.value = extractApiErrorMessage(
      error,
      '论坛数据加载失败，请稍后重试。',
    )
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
  ...FORUM_CATEGORIES.map((c: (typeof FORUM_CATEGORIES)[number]) => ({
    value: c.value,
    label: c.label,
    icon: c.icon,
  })),
])

const totalPostCount = computed(() => posts.value.length)
const totalCommentCount = computed(() => comments.value.length)

const isAdmin = computed(() => !!user.value?.isAdmin)

// Search & filter
const route = useRoute()
const router = useRouter()
const searchQuery = computed({
  get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
  set: (q: string) => {
    void router.replace({ query: { ...route.query, q: q || undefined } })
  },
})
const activeCategory = computed<ForumCategory | 'all'>({
  get: () =>
    FORUM_CATEGORIES.find((c) => c.value === route.query.category)?.value ??
    'all',
  set: (category) => {
    void router.push({
      query: {
        ...route.query,
        category: category === 'all' ? undefined : category,
      },
    })
  },
})
const categoryList = ref<HTMLElement>()
const categoryScroll = reactive({ before: false, after: false })
const pressedCategoryArrow = ref<number | null>(null)
const categoryArrowPointers = new WeakMap<HTMLButtonElement, { x: number; y: number }>()
let categoryResize: ResizeObserver | undefined
let categoryDisposed = false
function pressCategoryArrow(event: PointerEvent, direction: number) {
  const arrow = event.currentTarget as HTMLButtonElement
  if (arrow.disabled) return
  setCategoryArrowOrigin(event)
  if (event.pointerType !== 'mouse') pressedCategoryArrow.value = direction
}
function setCategoryArrowOrigin(event: PointerEvent) {
  const arrow = event.currentTarget as HTMLButtonElement
  if (arrow.disabled) return
  const visible = Number.parseFloat(getComputedStyle(arrow, '::before').opacity) > .01
  arrow.style.setProperty('--arrow-origin-duration', visible ? '480ms' : '0ms')
  const bounds = arrow.getBoundingClientRect()
  arrow.style.setProperty('--arrow-origin-x', `${event.clientX - bounds.left - arrow.clientLeft}px`)
  arrow.style.setProperty('--arrow-origin-y', `${event.clientY - bounds.top - arrow.clientTop}px`)
  trackCategoryArrowPointer(event)
}
function trackCategoryArrowPointer(event: PointerEvent) {
  categoryArrowPointers.set(event.currentTarget as HTMLButtonElement, { x: event.clientX, y: event.clientY })
}
function leaveCategoryArrow(event: PointerEvent) {
  pressedCategoryArrow.value = null
  const arrow = event.currentTarget as HTMLButtonElement
  const previous = categoryArrowPointers.get(arrow)
  categoryArrowPointers.delete(arrow)
  if (arrow.disabled || event.pointerType === 'touch') return
  const bounds = arrow.getBoundingClientRect()
  const radius = Math.min(bounds.width, bounds.height) / 2
  const inside = (x: number, y: number) => {
    const dx = Math.max(Math.abs(x - bounds.width / 2) - (bounds.width / 2 - radius), 0)
    const dy = Math.max(Math.abs(y - bounds.height / 2) - (bounds.height / 2 - radius), 0)
    return dx * dx + dy * dy <= radius * radius
  }
  const start = { x: previous ? previous.x - bounds.left : bounds.width / 2, y: previous ? previous.y - bounds.top : bounds.height / 2 }
  const end = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  // A fast move may deliver pointerleave far outside the button. Find where
  // that segment crossed the capsule rather than using the distant pointer.
  if (inside(start.x, start.y) && !inside(end.x, end.y)) {
    let low = 0
    let high = 1
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2
      if (inside(start.x + (end.x - start.x) * middle, start.y + (end.y - start.y) * middle)) low = middle
      else high = middle
    }
    end.x = start.x + (end.x - start.x) * low
    end.y = start.y + (end.y - start.y) * low
  }
  arrow.style.setProperty('--arrow-origin-duration', '360ms')
  arrow.style.setProperty('--arrow-origin-x', `${Math.max(0, Math.min(bounds.width, end.x)) - arrow.clientLeft}px`)
  arrow.style.setProperty('--arrow-origin-y', `${Math.max(0, Math.min(bounds.height, end.y)) - arrow.clientTop}px`)
}
function centerCategoryArrowOrigin(event: FocusEvent) {
  const arrow = event.currentTarget as HTMLButtonElement
  if (!arrow.matches(':focus-visible')) return
  arrow.style.setProperty('--arrow-origin-duration', '360ms')
  arrow.style.setProperty('--arrow-origin-x', '50%')
  arrow.style.setProperty('--arrow-origin-y', '50%')
}
function updateCategoryScroll() {
  const list = categoryList.value
  if (!list) return
  categoryScroll.before = list.scrollLeft > 2
  categoryScroll.after = list.scrollLeft + list.clientWidth < list.scrollWidth - 2
}
function categoryScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
}
function scrollCategories(direction: number) {
  const list = categoryList.value
  list?.scrollBy({ left: direction * list.clientWidth * .75, behavior: categoryScrollBehavior() })
}
function revealActiveCategory() {
  const list = categoryList.value
  const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!list || !active) return
  const left = active.offsetLeft - 6
  const right = active.offsetLeft + active.offsetWidth + 6
  if (left < list.scrollLeft) list.scrollTo({ left, behavior: categoryScrollBehavior() })
  else if (right > list.scrollLeft + list.clientWidth) list.scrollTo({ left: right - list.clientWidth, behavior: categoryScrollBehavior() })
  updateCategoryScroll()
}
watch(activeCategory, async () => { await nextTick(); revealActiveCategory() })
watch(totalPostCount, async () => { await nextTick(); updateCategoryScroll() })
onMounted(() => {
  categoryResize = new ResizeObserver(revealActiveCategory)
  if (categoryList.value) categoryResize.observe(categoryList.value)
  revealActiveCategory()
  document.fonts.ready.then(() => { if (!categoryDisposed) revealActiveCategory() })
})
onBeforeUnmount(() => { categoryDisposed = true; categoryResize?.disconnect() })
type SortMode = 'latest' | 'active' | 'views' | 'likes'
const sortMode = computed<SortMode>({
  get: () =>
    ['latest', 'active', 'views', 'likes'].includes(String(route.query.sort)) &&
    typeof route.query.sort === 'string'
      ? (route.query.sort as SortMode)
      : 'latest',
  set: (sort) => {
    void router.push({
      query: { ...route.query, sort: sort === 'latest' ? undefined : sort },
    })
  },
})
const hasFilters = computed(
  () =>
    !!searchQuery.value ||
    activeCategory.value !== 'all' ||
    sortMode.value !== 'latest',
)
function clearFilters() {
  void router.push({
    query: {
      ...route.query,
      q: undefined,
      category: undefined,
      sort: undefined,
    },
  })
}
const showAdminPanel = ref(false)

const sortOptions = [
  { value: 'latest' as const, label: '最新发布', icon: '🕐' },
  { value: 'active' as const, label: '讨论最多', icon: '💬' },
  { value: 'views' as const, label: '浏览最多', icon: '👁' },
  { value: 'likes' as const, label: '点赞最多', icon: '👍' },
]

const hotPosts = computed(() =>
  [...posts.value]
    .sort(
      (a, b) => b.commentCount - a.commentCount || b.viewCount - a.viewCount,
    )
    .slice(0, 5),
)

const filteredPosts = computed(() => {
  if (searchQuery.value.trim()) {
    const results = localSearchPosts(searchQuery.value)
    if (activeCategory.value !== 'all') {
      return results.filter(
        (p: (typeof results)[number]) => p.category === activeCategory.value,
      )
    }
    return results
  }
  return getPostsByCategory(
    activeCategory.value === 'all' ? undefined : activeCategory.value,
  )
})

const displayedPosts = computed(() => {
  const sorted = [...filteredPosts.value]
  return sorted.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (sortMode.value === 'active')
      return b.commentCount - a.commentCount || newestFirst(a, b)
    if (sortMode.value === 'views')
      return b.viewCount - a.viewCount || newestFirst(a, b)
    if (sortMode.value === 'likes')
      return b.likeCount - a.likeCount || newestFirst(a, b)
    return newestFirst(a, b)
  })
})

const resultSummary = computed(() => {
  const scope =
    activeCategory.value === 'all'
      ? '全部分类'
      : (categoryTabs.value.find((cat) => cat.value === activeCategory.value)
          ?.label ?? '当前分类')
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
  return posts.value.filter((post) => post.category === category).length
}

function clearSearch() {
  searchQuery.value = ''
}
</script>
