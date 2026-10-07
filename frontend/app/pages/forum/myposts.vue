<template>
  <div class="inner-page myposts-page">
    <!-- Header -->
    <InnerPageHeader title="我的帖子" description="管理你发布的所有帖子" :icon="Files" back-to="/forum" back-label="返回论坛">
      <template #actions>
        <InfoPopover label="我的统计" :icon="BarChart3">
          <p v-if="isLoading">正在加载统计…</p>
          <p v-else-if="loadError">{{ loadError }}</p>
          <dl v-else class="panel-stats">
            <div><dt>帖子</dt><dd>{{ myPosts.length }}</dd></div>
            <div><dt>收到评论</dt><dd>{{ totalComments }}</dd></div>
            <div><dt>获赞</dt><dd>{{ totalLikes }}</dd></div>
          </dl>
        </InfoPopover>
        <NuxtLink to="/forum/new" class="btn btn--primary"><Plus :size="18" :stroke-width="1.75" aria-hidden="true" />发布新帖</NuxtLink>
      </template>
    </InnerPageHeader>

    <!-- Content -->
    <section class="forum-content">
      <div class="container">
        <div class="forum-layout">
          <div class="forum-layout__main">
            <div v-if="loadError" class="forum-status forum-status--error">
              <span>{{ loadError }}</span>
              <button class="btn btn--outline btn--sm" @click="loadMyPosts">
                重试
              </button>
            </div>

            <div v-if="isLoading" class="forum-post-list">
              <div v-for="n in 3" :key="'skel-' + n" class="skeleton-card" data-transition-group="card">
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
              </div>
            </div>

            <div
              v-else-if="!loadError && myPosts.length === 0"
              class="forum-empty"
            >
              <div class="forum-empty__icon"><FilePenLine :size="36" :stroke-width="1.75" aria-hidden="true" /></div>
              <h3 class="forum-empty__title">你还没有发布过帖子</h3>
              <p class="forum-empty__desc">去论坛分享你的想法吧！</p>
              <NuxtLink to="/forum/new" class="btn btn--primary"
                >发布第一个帖子</NuxtLink
              >
            </div>

            <div v-else-if="!loadError" class="forum-post-list">
              <ScrollReveal>
                <div class="my-post-tools" data-transition-group="content">
                  <div class="my-post-search">
                    <ForumSearchField v-model="query" label="搜索我的帖子" placeholder="搜索标题、正文或标签" />
                  </div>
                  <ForumSortMenu v-model="sort" :choices="sortChoices" />
                </div>
              </ScrollReveal>
              <ScrollReveal>
                <div class="forum-results-bar" data-transition-group="content">
                  <span
                    >共 {{ myPosts.length }} 篇帖子 · 当前显示
                    {{ visiblePosts.length }} 篇</span
                  >
                </div>
              </ScrollReveal>
              <p v-if="visiblePosts.length === 0" role="status">
                未找到匹配的帖子，请尝试其它关键词。<button
                  class="btn btn--outline btn--sm"
                  @click="query = ''"
                >
                  清除搜索
                </button>
              </p>
              <TransitionGroup name="my-post-result" tag="div" class="my-post-results">
                <ScrollReveal v-for="post in visiblePosts" :key="post.id">
                  <ForumPostCard data-transition-group="card" :post="post" />
                </ScrollReveal>
              </TransitionGroup>
            </div>
          </div>

          <InfoDisclosure title="帖子管理提示">
            <ul class="guide-steps">
              <li>你可以编辑和删除自己的帖子；编辑仅支持修改内容。</li>
              <li>删除帖子会同时删除所有评论。</li>
              <li>分享清晰的过程，更有助于交流。</li>
            </ul>
          </InfoDisclosure>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Files, BarChart3, Plus, FilePenLine } from '@lucide/vue'
import type { ForumPost } from '~~/shared/forum'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '我的帖子 – DevBit Tech 论坛',
  description: '查看和管理你在 DevBit Tech 论坛发布的所有帖子。',
})

const { user } = useAuth()
const { fetchMyPosts } = useForum()

const myPosts = ref<ForumPost[]>([])
const isLoading = ref(true)
const loadError = ref('')
const query = ref('')
type MyPostSort = 'latest' | 'likes' | 'comments'
const sort = ref<MyPostSort>('latest')
const sortChoices: { value: MyPostSort; label: string }[] = [
  { value: 'latest', label: '最新发布' },
  { value: 'likes', label: '获赞最多' },
  { value: 'comments', label: '评论最多' },
]
const visiblePosts = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return myPosts.value
    .filter((p) =>
      [p.title, p.content, ...p.tags]
        .join(' ')
        .toLocaleLowerCase()
        .includes(term),
    )
    .sort((a, b) => {
      const score =
        sort.value === 'likes'
          ? b.likeCount - a.likeCount
          : sort.value === 'comments'
            ? b.commentCount - a.commentCount
            : 0
      return (
        score ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id - a.id
      )
    })
})

const totalComments = computed(() =>
  myPosts.value.reduce((sum, p) => sum + p.commentCount, 0),
)

const totalLikes = computed(() =>
  myPosts.value.reduce((sum, p) => sum + p.likeCount, 0),
)

async function loadMyPosts() {
  isLoading.value = true
  loadError.value = ''
  try {
    myPosts.value = await fetchMyPosts()
  } catch {
    loadError.value = '加载帖子失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadMyPosts()
})
</script>
