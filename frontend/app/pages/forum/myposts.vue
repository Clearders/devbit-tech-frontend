<template>
  <div class="myposts-page">
    <!-- Header -->
    <section class="page-header">
      <div class="container">
        <NuxtLink to="/forum" class="forum-detail__back">← 返回论坛</NuxtLink>
        <h1 class="page-header__title">📋 我的帖子</h1>
        <p class="page-header__subtitle">管理你发布的所有帖子</p>
      </div>
    </section>

    <!-- Content -->
    <section class="forum-content">
      <div class="container">
        <div class="forum-layout">
          <div class="forum-layout__main">
            <div v-if="loadError" class="forum-status forum-status--error">
              <span>{{ loadError }}</span>
              <button class="btn btn--outline btn--sm" @click="loadMyPosts">重试</button>
            </div>

            <div v-if="isLoading" class="forum-post-list">
              <div v-for="n in 3" :key="'skel-'+n" class="skeleton-card">
                <div class="skeleton-card__header">
                  <div class="skeleton skeleton--avatar"></div>
                  <div class="skeleton skeleton--text-sm" style="width: 30%;"></div>
                </div>
                <div class="skeleton-card__body">
                  <div class="skeleton skeleton--title" style="width: 70%;"></div>
                  <div class="skeleton skeleton--text"></div>
                  <div class="skeleton skeleton--text" style="width: 60%;"></div>
                </div>
              </div>
            </div>

            <div v-else-if="myPosts.length === 0" class="forum-empty">
              <div class="forum-empty__icon">📝</div>
              <h3 class="forum-empty__title">你还没有发布过帖子</h3>
              <p class="forum-empty__desc">去论坛分享你的想法吧！</p>
              <NuxtLink to="/forum/new" class="btn btn--primary">发布第一个帖子</NuxtLink>
            </div>

            <div v-else class="forum-post-list">
              <div class="forum-results-bar">
                <span>共 {{ myPosts.length }} 篇帖子</span>
                <NuxtLink to="/forum/new" class="btn btn--primary btn--sm">✏️ 发布新帖</NuxtLink>
              </div>
              <ForumPostCard
                v-for="post in myPosts"
                :key="post.id"
                :post="post"
              />
            </div>
          </div>

          <aside class="forum-layout__sidebar">
            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">📊 我的统计</h3>
              <div class="forum-sidebar-card__stats">
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ myPosts.length }}</span>
                  <span class="forum-sidebar-card__stat-label">帖子</span>
                </div>
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ totalComments }}</span>
                  <span class="forum-sidebar-card__stat-label">收到评论</span>
                </div>
                <div class="forum-sidebar-card__stat">
                  <span class="forum-sidebar-card__stat-value">{{ totalLikes }}</span>
                  <span class="forum-sidebar-card__stat-label">获赞</span>
                </div>
              </div>
            </div>

            <div class="forum-sidebar-card">
              <h3 class="forum-sidebar-card__title">💡 提示</h3>
              <ul class="forum-sidebar-card__rules">
                <li>你可以编辑和删除自己的帖子</li>
                <li>编辑帖子仅支持修改内容</li>
                <li>删除帖子会同时删除所有评论</li>
                <li>优质帖子可以提升社区声望</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ForumPost } from '~~/shared/forum'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '我的帖子 – DevBit Tech 论坛',
  description: '查看和管理你在 DevBit Tech 论坛发布的所有帖子。'
})

const { user } = useAuth()
const { fetchMyPosts } = useForum()

const myPosts = ref<ForumPost[]>([])
const isLoading = ref(true)
const loadError = ref('')

const totalComments = computed(() =>
  myPosts.value.reduce((sum, p) => sum + p.commentCount, 0)
)

const totalLikes = computed(() =>
  myPosts.value.reduce((sum, p) => sum + p.likeCount, 0)
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
