<template>
  <div ref="forumRoot" class="forum-page">
    <section class="forum-heading">
      <ScrollReveal>
        <div class="container forum-heading__row" data-transition-group="title">
          <div class="forum-heading__intro">
            <h1 class="forum-heading__title"><span class="forum-heading__mark"><MessageSquare :size="28" :stroke-width="1.75" /></span>论坛</h1>
            <p class="forum-heading__subtitle">交流技术，分享经验，解决问题。</p>
          </div>
          <div class="forum-heading__actions">
            <ForumCommunityPanel :post-count="totalPostCount" :comment-count="totalCommentCount"
              :user-count="users.length" :hot-posts="hotPosts" :loading="isLoadingForum" :error="loadError"
              @retry="loadForum(true)" />
            <Transition :css="false" @before-enter="motion.beforeInline" @enter="motion.enterInline" @leave="motion.leaveInline"
              @enter-cancelled="motion.stop" @leave-cancelled="motion.stop">
              <span v-if="isAuthenticated" class="forum-heading__action-slot"><span class="forum-heading__action-inner">
                <NuxtLink to="/forum/new" class="forum-header-action forum-header-action--primary" data-forum-control>
                  <span class="forum-control-icon" data-forum-icon><Plus :size="18" :stroke-width="1.75" /></span>发布帖子
                </NuxtLink>
              </span></span>
            </Transition>
            <Transition :css="false" @before-enter="motion.beforeInline" @enter="motion.enterInline" @leave="motion.leaveInline"
              @enter-cancelled="motion.stop" @leave-cancelled="motion.stop">
              <span v-if="isAdmin" class="forum-heading__action-slot"><span class="forum-heading__action-inner">
                <button type="button" class="forum-header-action" data-forum-control :aria-expanded="showAdminPanel"
                  aria-controls="forum-admin-panel" @click="showAdminPanel = !showAdminPanel">
                  <span class="forum-control-icon" data-forum-icon><Shield :size="18" :stroke-width="1.75" /></span>管理
                </button>
              </span></span>
            </Transition>
          </div>
        </div>
      </ScrollReveal>
    </section>

    <section class="forum-tools" aria-label="搜索与筛选帖子">
      <ScrollReveal>
        <div class="container" data-transition-group="content">
          <div class="forum-tools__row">
            <div ref="searchSource" class="forum-search-host" :class="{ 'is-docked': searchDocked }" :inert="searchDocked" :aria-hidden="searchDocked">
              <ForumSearchField v-model="searchQuery" @composition="composing = $event" />
            </div>
            <div ref="sortSource" class="forum-sort-host" :class="{ 'is-docked': sortDocked }" :inert="sortDocked" :aria-hidden="sortDocked">
              <ForumSortMenu v-model="sortMode" :active="!sortDocked" :dismiss="popup === 'search'" @open-change="controls.setSortOpen" />
            </div>
          </div>
          <div class="forum-filter-nav" role="group" aria-label="帖子分类">
            <button type="button" class="forum-filter-nav__arrow" data-forum-control aria-label="查看前面的分类"
              aria-controls="forum-category-list" :disabled="!categoryScroll.before" @click="scrollCategories(-1)">
              <span class="forum-filter-nav__wash" data-forum-wash aria-hidden="true"></span>
              <span class="forum-control-icon" data-forum-icon><ChevronLeft :size="18" :stroke-width="1.75" /></span>
            </button>
            <div class="forum-filter-window">
              <div id="forum-category-list" ref="categoryList" class="forum-filter-list" @scroll.passive="updateCategoryScroll">
                <span ref="categoryIndicator" class="forum-filter-indicator" aria-hidden="true"></span>
                <button v-for="cat in categoryTabs" :key="cat.value" type="button" class="forum-filter-tab"
                  :aria-pressed="activeCategory === cat.value" @click="activeCategory = cat.value">
                  <span>{{ cat.label }}</span><span class="forum-filter-tab__count">{{ getCategoryCount(cat.value) }}</span>
                </button>
              </div>
            </div>
            <button type="button" class="forum-filter-nav__arrow" data-forum-control aria-label="查看后面的分类"
              aria-controls="forum-category-list" :disabled="!categoryScroll.after" @click="scrollCategories(1)">
              <span class="forum-filter-nav__wash" data-forum-wash aria-hidden="true"></span>
              <span class="forum-control-icon" data-forum-icon><ChevronRight :size="18" :stroke-width="1.75" /></span>
            </button>
          </div>
        </div>
      </ScrollReveal>
    </section>

    <!-- Main content -->
    <section class="forum-content">
      <div class="container">
        <div class="forum-layout">
          <!-- Left: Post list -->
          <div class="forum-layout__main">
            <!-- Admin Panel -->
            <Transition :css="false" @before-enter="motion.beforePanel" @enter="motion.enterPanel" @leave="motion.leavePanel"
              @enter-cancelled="motion.stop" @leave-cancelled="motion.stop">
              <div v-if="showAdminPanel && isAdmin" id="forum-admin-panel" class="forum-admin-disclosure">
                <div class="forum-admin-disclosure__body"><ForumAdminPanel /></div>
              </div>
            </Transition>

            <div v-if="loadError" class="forum-status forum-status--error">
              <span>{{ loadError }}</span>
              <button class="btn btn--outline btn--sm" @click="loadForum(true)">
                重试
              </button>
            </div>

            <ScrollReveal v-if="!loadError">
              <div class="forum-results-bar" data-transition-group="content">
                <span :title="resultSummary">{{ resultSummary }}</span>
                <button
                  v-if="hasFilters"
                  type="button"
                  class="forum-results-bar__clear"
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
            </ScrollReveal>

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
                <Search v-if="searchQuery" :size="36" :stroke-width="1.5" />
                <MessageSquare v-else :size="36" :stroke-width="1.5" />
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
              <ScrollReveal v-for="post in displayedPosts" :key="post.id">
                <ForumPostCard data-transition-group="card"
                  :post="post"
                />
              </ScrollReveal>
            </div>
          </div>


        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare, Search, Plus, Shield, ChevronLeft, ChevronRight } from '@lucide/vue'
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

const forumRoot = ref<HTMLElement>()
const controls = useForumControls()
const { searchSource, sortSource, searchDocked, sortDocked, composing, popup, searchQuery, sortMode } = controls
const categoryIndicator = ref<HTMLElement>()
const motion = useForumHeaderMotion(forumRoot)
const isLoadingForum = ref(posts.value.length === 0)
const loadError = ref('')

async function loadForum(force = false) {
  isLoadingForum.value = force || posts.value.length === 0
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
  { value: 'all' as const, label: '全部' },
  ...FORUM_CATEGORIES.map((c: (typeof FORUM_CATEGORIES)[number]) => ({
    value: c.value,
    label: c.label,
  })),
])

const totalPostCount = computed(() => posts.value.length)
const totalCommentCount = computed(() => comments.value.length)

const isAdmin = computed(() => !!user.value?.isAdmin)

// Search & filter
const route = useRoute()
const router = useRouter()
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
let categoryResize: ResizeObserver | undefined
let categoryDisposed = false
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
  motion.activeCategory(list, categoryIndicator.value)
}
watch(activeCategory, async () => { await nextTick(); revealActiveCategory() })
watch(totalPostCount, async () => { await nextTick(); revealActiveCategory() })
onMounted(() => {
  categoryResize = new ResizeObserver(revealActiveCategory)
  if (categoryList.value) categoryResize.observe(categoryList.value)
  revealActiveCategory()
  document.fonts.ready.then(() => { if (!categoryDisposed) revealActiveCategory() })
})
onBeforeUnmount(() => { categoryDisposed = true; categoryResize?.disconnect(); composing.value = false })
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

</script>
