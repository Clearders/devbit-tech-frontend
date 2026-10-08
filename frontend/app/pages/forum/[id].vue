<template>
  <div class="inner-page forum-detail-route" :class="{ 'forum-detail-route--has-post': post && !isLoadingPost }">
  <Transition name="forum-detail-content" mode="out-in">
  <div v-if="isLoadingPost" class="forum-detail forum-detail--loading">
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <NuxtLink to="/forum" class="forum-detail__back"><ArrowLeft :size="18" :stroke-width="1.75" aria-hidden="true" />返回论坛</NuxtLink>
          <!-- Skeleton detail view -->
          <div
            class="skeleton skeleton--title"
            style="width: 35%; margin-bottom: 1rem"
          ></div>
          <div
            class="skeleton skeleton--title"
            style="width: 75%; height: 2rem; margin-bottom: 1.5rem"
          ></div>
          <div
            class="skeleton skeleton--text"
            style="width: 50%; margin-bottom: 0.75rem"
          ></div>
          <div class="skeleton-card" style="margin-top: 1rem" data-transition-group="card">
            <div class="skeleton skeleton--text"></div>
            <div class="skeleton skeleton--text" style="width: 90%"></div>
            <div class="skeleton skeleton--text" style="width: 70%"></div>
            <div class="skeleton skeleton--text" style="width: 85%"></div>
            <div class="skeleton skeleton--text" style="width: 50%"></div>
          </div>
          <!-- Skeleton comments -->
          <div style="margin-top: 2rem">
            <div
              class="skeleton skeleton--title"
              style="width: 25%; margin-bottom: 1rem"
            ></div>
            <div v-for="n in 3" :key="'skel-c-' + n" class="skeleton-comment">
              <div class="skeleton skeleton--avatar"></div>
              <div class="skeleton-comment__body">
                <div class="skeleton skeleton--text-sm" style="width: 20%"></div>
                <div class="skeleton skeleton--text"></div>
                <div class="skeleton skeleton--text" style="width: 60%"></div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  </div>

  <div class="forum-detail" v-else-if="post">
    <!-- Header -->
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <NuxtLink to="/forum" class="forum-detail__back"><ArrowLeft :size="18" :stroke-width="1.75" aria-hidden="true" />返回论坛</NuxtLink>
          <div class="forum-detail__header">
            <div class="detail-header-tools">
            <div class="forum-detail__header-top">
              <span class="forum-detail__category">
                <component :is="categoryIcon" :size="16" :stroke-width="1.75" aria-hidden="true" />
                {{ categoryInfo?.label }}
              </span>
              <span
                v-if="post.isPinned"
                class="forum-detail__badge forum-detail__badge--pin"
                ><Pin :size="14" :stroke-width="1.75" aria-hidden="true" />置顶</span
              >
              <span
                v-if="post.isLocked"
                class="forum-detail__badge forum-detail__badge--lock"
                ><LockKeyhole :size="14" :stroke-width="1.75" aria-hidden="true" />已锁定</span
              >
            </div>

              <div class="detail-header-tools__actions">
                <InfoPopover v-slot="{ close }" label="帖子信息" :icon="Info">
                  <InfoPanelTabs :items="infoSections" label="帖子扩展信息">
                    <template #author>
                      <div class="panel-author">
                        <AvatarImage :avatar-url="post.author.avatarUrl" :avatar="post.author.avatar" :name="post.author.name" size="md" />
                        <div>{{ post.author.name }}<p v-if="post.author.isAdmin">管理员</p></div>
                      </div>
                      <button v-if="isAuthenticated && user?.id !== post.author.id" type="button" class="btn btn--outline"
                        @click="close(false); openMessagePanel(post.author.id)"><MessageSquare :size="18" :stroke-width="1.75" aria-hidden="true" />发送私信</button>
                    </template>
                    <template #stats>
                      <ul class="panel-info">
                        <li><span>分类</span><span>{{ categoryInfo?.label }}</span></li>
                        <li><span>浏览</span><span>{{ formatCount(post.viewCount) }}</span></li>
                        <li><span>点赞</span><span>{{ post.likeCount }}</span></li>
                        <li><span>评论</span><span>{{ post.commentCount }}</span></li>
                        <li><span>发布</span><span>{{ formatRelativeTime(post.createdAt) }}</span></li>
                        <li v-if="post.updatedAt !== post.createdAt"><span>编辑</span><span>{{ formatRelativeTime(post.updatedAt) }}</span></li>
                      </ul>
                    </template>
                    <template #related>
                      <ul v-if="relatedPosts.length" class="panel-links">
                        <li v-for="related in relatedPosts" :key="related.id"><NuxtLink :to="`/forum/${related.id}`">
                          <span>{{ related.title }}</span><span>{{ related.commentCount }} 评论</span>
                        </NuxtLink></li>
                      </ul>
                      <p v-else>暂无相关帖子。</p>
                    </template>
                  </InfoPanelTabs>
                  <div class="forum-detail__mobile-share">
                    <button type="button" class="btn btn--outline" @click="copyPostLink">复制链接</button>
                    <p v-if="shareMessage" role="status">{{ shareMessage }}</p>
                    <label v-if="shareFallback">帖子链接<input class="form-control" :value="shareFallback" readonly
                      @focus="($event.target as HTMLInputElement).select()" /></label>
                  </div>
                </InfoPopover>
                <InfoPopover v-if="canDeletePost || isAdmin" v-slot="{ close }" label="帖子操作" :icon="Ellipsis">
<div class="panel-actions">
              <button
                v-if="isAdmin"
                class="btn btn--sm"
                :class="post.isPinned ? 'btn--warning' : 'btn--outline'"
                @click="close(); handleTogglePin()"
              >
                <Pin :size="18" :stroke-width="1.75" aria-hidden="true" />{{ post.isPinned ? '取消置顶' : '置顶' }}
              </button>
              <button
                v-if="isAdmin"
                class="btn btn--sm"
                :class="post.isLocked ? 'btn--warning' : 'btn--outline'"
                @click="close(); handleToggleLock()"
              >
                <component :is="post.isLocked ? UnlockKeyhole : LockKeyhole" :size="18" :stroke-width="1.75" aria-hidden="true" />{{ post.isLocked ? '解锁' : '锁定' }}
              </button>
              <NuxtLink
                v-if="canEditPost"
                :to="`/forum/edit/${post.id}`"
                @click="close(false)"
                class="btn btn--sm btn--outline"
              >
                <FilePenLine :size="18" :stroke-width="1.75" aria-hidden="true" />编辑
              </NuxtLink>
              <button
                v-if="canDeletePost"
                class="btn btn--sm btn--danger"
                @click="close(); handleDeletePost()"
              >
                <Trash2 :size="18" :stroke-width="1.75" aria-hidden="true" />删除
              </button>
            </div>

                </InfoPopover>
              </div>
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
                  <span v-if="post.author.isAdmin" class="forum-detail__admin-tag"
                    >管理员</span
                  >
                </span>
              </div>
              <div class="forum-detail__stats">
                <span><Clock3 :size="15" :stroke-width="1.75" aria-hidden="true" />{{ formatRelativeTime(post.createdAt) }}</span>
                <span class="forum-detail__desktop-comment-count"><MessageSquare :size="15" :stroke-width="1.75" aria-hidden="true" />{{ post.commentCount }} 评论</span>
                <span class="forum-detail__mobile-reading">预计阅读 {{ readingMinutes }} 分钟</span>
              </div>
            </div>

            <div v-if="actionError" class="form-error form-error--global">
              {{ actionError }}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>

    <!-- Content -->
    <section class="forum-detail-content">
      <div class="container">
        <div class="forum-detail__layout">
          <!-- Post body -->
          <div class="forum-detail__body" data-transition-group="content">
            <ScrollReveal>
              <div class="page-tools" data-transition-group="content">
                <span>预计阅读 {{ readingMinutes }} 分钟</span>
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  @click="copyPostLink"
                >
                  复制链接
                </button>
                <a href="#post-comments" class="btn btn--outline btn--sm"
                  >跳到评论 <MessageSquare :size="16" :stroke-width="1.75" aria-hidden="true" /></a
                >
              </div>
            </ScrollReveal>
            <p v-if="shareMessage" class="forum-detail__desktop-share" role="status">{{ shareMessage }}</p>
            <label v-if="shareFallback" class="share-fallback forum-detail__desktop-share"
              >帖子链接<input
                class="form-control"
                :value="shareFallback"
                readonly
                @focus="($event.target as HTMLInputElement).select()"
            /></label>
            <div class="forum-detail__text">
              <MarkdownRenderer :content="post.content" />
            </div>

            <!-- Tags -->
            <div class="forum-detail__tags" v-if="post.tags.length">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="forum-detail__tag"
                >{{ tag }}</span
              >
            </div>

            <!-- Like action -->
            <div class="forum-detail__actions">
              <button
                class="btn btn--lg forum-detail__like-btn"
                :class="post.likedByMe ? 'btn--primary' : 'btn--outline'"
                @click="handleLike"
                :disabled="!isAuthenticated || submittingLike"
                :aria-pressed="post.likedByMe"
                :title="!isAuthenticated ? '请先登录' : ''"
              >
                <ThumbsUp :size="18" :stroke-width="1.75" aria-hidden="true" />点赞 ({{ post.likeCount }})
              </button>
              <p v-if="likeError" class="form-error" role="alert">{{ likeError }}</p>
            </div>

            <!-- Comments section -->
            <div
              id="post-comments"
              class="forum-detail__comments"
              style="scroll-margin-top: 6rem"
            >
              <ScrollReveal>
                <h2 class="forum-detail__comments-title">
                  <MessageSquare :size="22" :stroke-width="1.75" aria-hidden="true" />评论 ({{ postComments.length }})
                  <span v-if="post.isLocked" class="forum-detail__locked-hint"
                    >— 帖子已锁定，无法添加新评论</span
                  >
                </h2>
              </ScrollReveal>

              <div id="post-comment-composer-mobile" class="forum-detail__mobile-composer"></div>

              <!-- Comment list -->
              <div
                v-if="postComments.length"
                class="forum-detail__comment-list"
              >
                <ScrollReveal v-for="comment in postComments" :key="comment.id">
                  <ForumComment
                    :comment="comment"
                    :can-delete="canDeleteComment(comment)"
                    @delete="handleDeleteComment"
                  />
                </ScrollReveal>
              </div>
              <div v-else class="forum-detail__no-comments">
                暂无评论，快来发表第一条评论吧！
              </div>

              <!-- Add comment -->
              <Teleport v-if="!post.isLocked && isAuthenticated" defer to="#post-comment-composer-mobile" :disabled="!isMobile">
              <ScrollReveal>
                <div

                  class="forum-detail__add-comment"
                >
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
                      ref="commentInput"
                      v-model="newComment"
                      aria-label="写下你的评论"
                      :aria-describedby="commentError ? 'post-comment-error' : undefined"
                      class="form-control form-control--textarea"
                      placeholder="写下你的评论…"
                      rows="3"
                      @keydown.ctrl.enter="handleAddComment"
                      @focus="isCommentFocused = true"
                      @blur="isCommentFocused = false"
                    ></textarea>
                    <p v-if="commentError" id="post-comment-error" class="form-error" role="alert">{{ commentError }}</p>
                    <div class="forum-detail__comment-actions">
                      <span class="forum-detail__comment-hint"
                        >Ctrl + Enter 发送</span
                      >
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
              </ScrollReveal>
              </Teleport>
              <div v-else-if="post.isLocked" class="forum-detail__locked-msg">
                <LockKeyhole :size="18" :stroke-width="1.75" aria-hidden="true" />该帖子已被锁定，无法添加评论
              </div>
              <div v-else class="forum-detail__login-prompt">
                <NuxtLink to="/login" class="btn btn--outline"
                  >登录后参与评论</NuxtLink
                >
              </div>
            </div>
          </div>


        </div>
      </div>
    </section>
  </div>

  <!-- Not found -->
  <div v-else class="forum-detail forum-detail--404">
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title" style="text-align: center">
          <h1 class="page-header__title"><CircleHelp :size="28" :stroke-width="1.75" aria-hidden="true" />帖子未找到</h1>
          <p class="page-header__subtitle">
            {{ actionError || '该帖子可能已被删除或不存在。' }}
          </p>
          <NuxtLink
            to="/forum"
            class="btn btn--primary"
            style="margin-top: 1.5rem"
            ><ArrowLeft :size="18" :stroke-width="1.75" aria-hidden="true" />返回论坛</NuxtLink
          >
        </div>
      </ScrollReveal>
    </section>
  </div>
  </Transition>
  <Teleport to="body">
    <nav v-if="post && !isLoadingPost" v-show="!isCommentFocused" class="forum-detail__mobile-bar" aria-label="帖子互动">
      <p v-if="likeError" class="forum-detail__bar-error form-error" role="alert">{{ likeError }}</p>
      <button type="button" class="forum-detail__bar-compose" :disabled="post.isLocked" @click="focusComment">
        <FilePenLine :size="18" aria-hidden="true" />{{ post.isLocked ? '已锁定' : '写评论' }}
      </button>
      <a href="#post-comments" :aria-label="`查看 ${post.commentCount} 条评论`" class="forum-detail__bar-comments">
        <MessageSquare :size="18" aria-hidden="true" /><span>{{ formatCount(post.commentCount) }}</span>
      </a>
      <button type="button" class="forum-detail__bar-like" :class="{ 'is-liked': post.likedByMe }"
        :disabled="!isAuthenticated || submittingLike" :aria-pressed="post.likedByMe"
        :aria-label="!isAuthenticated ? '登录后点赞' : `${post.likedByMe ? '取消点赞' : '点赞'}，${post.likeCount} 个赞`" @click="handleLike">
        <ThumbsUp :size="18" aria-hidden="true" />
        <span>{{ !isAuthenticated ? '登录后点赞' : formatCount(post.likeCount) }}</span>
      </button>
    </nav>
  </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, MessageSquare, Info, Ellipsis, Pin, LockKeyhole, UnlockKeyhole, FilePenLine, Trash2, Clock3, ThumbsUp, CircleHelp, Code2, Diamond, Layers, Megaphone } from '@lucide/vue'
import ForumComment from '~/components/ForumComment.vue'
import AvatarImage from '~/components/AvatarImage.vue'
import { useForum } from '~/composables/useForum'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import {
  formatCount,
  formatRelativeTime,
  getForumCategory,
} from '~/utils/forum'

const infoSections = [{ id: 'author', label: '作者' }, { id: 'stats', label: '统计' }, { id: 'related', label: '相关帖子' }] as const
const categoryIcon = computed(() => ({ general: MessageSquare, tech: Code2, devbit: Diamond, help: CircleHelp,
  showcase: Layers, announcement: Megaphone })[post.value?.category ?? 'general'])

// Update title and description dynamically
useSeoMeta({
  title: '帖子详情 – DevBit Tech',
  description: '查看帖子详情与讨论。',
})

const route = useRoute()
const { user, isAuthenticated } = useAuth()
const {
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
  openMessagePanel,
} = useForum()

const postId = computed(() => Number(route.params.id))
const post = computed(() => getPostById(postId.value))
const readingMinutes = computed(() =>
  Math.max(
    1,
    Math.ceil((post.value?.content.replace(/\s/g, '').length ?? 0) / 400),
  ),
)
const shareMessage = ref('')
const shareFallback = ref('')
watch(postId, () => {
  shareMessage.value = ''
  shareFallback.value = ''
})
async function copyPostLink() {
  const link = new URL('/forum/' + postId.value, window.location.origin).href
  shareFallback.value = ''
  try {
    await navigator.clipboard.writeText(link)
    shareMessage.value = '链接已复制'
  } catch {
    shareMessage.value = '无法自动复制，请选中下方链接手动复制。'
    shareFallback.value = link
  }
}
const postComments = computed(() => getCommentsByPostId(postId.value))
const newComment = ref('')
const actionError = ref('')
const isLoadingPost = ref(!post.value)
const submittingComment = ref(false)
const submittingLike = ref(false)
const likeError = ref('')
const commentError = ref('')
const commentInput = ref<HTMLTextAreaElement>()
const isCommentFocused = ref(false)
const isMobile = ref(false)
let mobileMedia: MediaQueryList | undefined
function updateMobileLayout() {
  isMobile.value = !!mobileMedia?.matches
}
onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 767.98px)')
  updateMobileLayout()
  mobileMedia.addEventListener('change', updateMobileLayout)
})
onBeforeUnmount(() => mobileMedia?.removeEventListener('change', updateMobileLayout))

watch(postId, () => {
  newComment.value = ''
  commentError.value = ''
  likeError.value = ''
  isCommentFocused.value = false
})

async function focusComment() {
  if (post.value?.isLocked) return
  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }
  const input = commentInput.value
  input?.focus({ preventScroll: true })
  input?.scrollIntoView({ block: 'center', behavior: 'instant' })
}

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
  post.value ? getForumCategory(post.value.category) : null,
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

  // The list already holds the full post. Keep it visible while refreshing,
  // so route entry is not interrupted by a skeleton replacing the page root.
  isLoadingPost.value = !getPostById(id)
  try {
    await ensureInit()
    await loadPost(id)
    await loadCommentsForPost(id)
  } catch (error: unknown) {
    if (postId.value === id) actionError.value = extractApiErrorMessage(
      error,
      '帖子加载失败，请稍后重试。',
    )
  } finally {
    if (postId.value === id) isLoadingPost.value = false
  }
}

// Start the initial refresh after hydration. An unawaited SSR request can
// otherwise put a post in the payload after the loading HTML was rendered.
onMounted(() => { void loadCurrentPost(postId.value) })
watch(postId, (newId) => { void loadCurrentPost(newId) })

function canDeleteComment(comment: { author: { id: number } }) {
  if (!user.value) return false
  return user.value.id === comment.author.id || user.value.isAdmin
}

const relatedPosts = computed(() => {
  if (!post.value) return []
  return posts.value
    .filter(
      (p) => p.id !== post.value!.id && p.category === post.value!.category,
    )
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
  if (!text || submittingComment.value || !isAuthenticated.value || post.value?.isLocked) return
  const id = postId.value
  submittingComment.value = true
  commentError.value = ''
  try {
    await addComment(id, text)
    if (postId.value === id && newComment.value.trim() === text) newComment.value = ''
  } catch (error: unknown) {
    if (postId.value === id) commentError.value = extractApiErrorMessage(error, '发表评论失败，请稍后重试。')
  } finally {
    submittingComment.value = false
  }
}

function handleDeleteComment(commentId: number) {
  if (confirm('确定要删除该评论吗？')) {
    void runAction(() => deleteComment(commentId), '删除评论失败，请稍后重试。')
  }
}

function handleTogglePin() {
  void runAction(
    () => togglePinPost(postId.value),
    '更新置顶状态失败，请稍后重试。',
  )
}

function handleToggleLock() {
  void runAction(
    () => toggleLockPost(postId.value),
    '更新锁定状态失败，请稍后重试。',
  )
}

function handleDeletePost() {
  if (confirm('确定要删除该帖子吗？此操作不可撤销。')) {
    void runAction(async () => {
      await deletePost(postId.value)
      await navigateTo('/forum')
    }, '删除帖子失败，请稍后重试。')
  }
}

async function handleLike() {
  if (!isAuthenticated.value || submittingLike.value) return
  const id = postId.value
  submittingLike.value = true
  likeError.value = ''
  try {
    await toggleLikePost(id)
  } catch (error: unknown) {
    if (postId.value === id) likeError.value = extractApiErrorMessage(error, '点赞失败，请稍后重试。')
  } finally {
    submittingLike.value = false
  }
}
</script>
