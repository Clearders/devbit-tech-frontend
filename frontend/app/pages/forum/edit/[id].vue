<template>
  <div class="post-editor-page">
    <!-- Header -->
    <section class="page-header">
      <div class="container">
        <NuxtLink :to="`/forum/${postId}`" class="post-editor__back">← 返回帖子</NuxtLink>
        <h1 class="page-header__title">✏️ 编辑帖子</h1>
        <p class="page-header__subtitle">修改你的帖子内容</p>
      </div>
    </section>

    <!-- Loading -->
    <section v-if="isLoadingPost" class="post-editor__content">
      <div class="container" style="text-align: center; padding: 3rem;">
        <div class="skeleton skeleton--title" style="width: 240px; margin: 0 auto 1rem;"></div>
        <div class="skeleton skeleton--text" style="width: 360px; margin: 0 auto;"></div>
      </div>
    </section>

    <!-- Forbidden -->
    <section v-else-if="forbidden" class="post-editor__content">
      <div class="container" style="text-align: center; padding: 4rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🚫</div>
        <h2>没有编辑权限</h2>
        <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">
          {{ forbidden }}
        </p>
        <NuxtLink :to="`/forum/${postId}`" class="btn btn--primary">返回帖子</NuxtLink>
      </div>
    </section>

    <!-- Editor form -->
    <section v-else class="post-editor__content">
      <div class="container">
        <div v-if="apiError" class="form-error form-error--global post-editor__error">
          {{ apiError }}
        </div>

        <div class="post-editor__meta">
          <!-- Title (read-only) -->
          <div class="form-group">
            <label class="form-label">标题</label>
            <input
              type="text"
              class="form-control"
              :value="originalPost?.title"
              disabled
            />
            <span class="post-editor__field-hint">标题不可修改</span>
          </div>

          <div class="post-editor__meta-row">
            <!-- Category (read-only) -->
            <div class="form-group">
              <label class="form-label">分类</label>
              <input
                type="text"
                class="form-control"
                :value="categoryLabel"
                disabled
              />
            </div>

            <!-- Tags (read-only) -->
            <div class="form-group">
              <label class="form-label">标签</label>
              <input
                type="text"
                class="form-control"
                :value="originalPost?.tags.join(', ') || ''"
                disabled
              />
            </div>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div class="post-editor__editor-wrapper">
          <MarkdownEditor
            ref="editorRef"
            v-model="content"
            placeholder="编辑你的帖子内容…（支持 Markdown 语法）"
          />
        </div>

        <div v-if="errors.content" class="form-error post-editor__content-error">
          {{ errors.content }}
        </div>

        <!-- Diff hint -->
        <div v-if="content !== originalPost?.content" class="post-editor__diff-hint">
          📝 内容已修改，请提交保存更新。
        </div>

        <!-- Actions -->
        <div class="post-editor__actions">
          <NuxtLink :to="`/forum/${postId}`" class="btn btn--outline btn--lg">
            ← 取消
          </NuxtLink>
          <div class="post-editor__actions-right">
            <button
              type="button"
              class="btn btn--primary btn--lg"
              :disabled="submitting || content === originalPost?.content"
              @click="handleSubmit"
            >
              {{ submitting ? '保存中…' : '💾 保存修改' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ForumPost } from '~/composables/useForum'
import { useForum, FORUM_CATEGORIES } from '~/composables/useForum'
import MarkdownEditor from '~/components/MarkdownEditor.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '编辑帖子 – DevBit Tech',
  description: '编辑你在 DevBit Tech 论坛发布的帖子内容。'
})

const route = useRoute()
const { user } = useAuth()
const { getPostById, ensureInit, loadPost, modifyPost } = useForum()

const postId = computed(() => Number(route.params.id))
const originalPost = ref<ForumPost | null>(null)
const content = ref('')
const isLoadingPost = ref(true)
const forbidden = ref('')
const submitting = ref(false)
const apiError = ref('')
const errors = reactive({ content: '' })
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)

const categoryLabel = computed(() => {
  if (!originalPost.value) return ''
  const cat = FORUM_CATEGORIES.find(c => c.value === originalPost.value!.category)
  return cat ? `${cat.icon} ${cat.label}` : originalPost.value.category
})

async function loadPostData() {
  isLoadingPost.value = true
  forbidden.value = ''
  apiError.value = ''

  const id = postId.value
  if (!Number.isFinite(id) || id < 1) {
    forbidden.value = '帖子地址无效。'
    isLoadingPost.value = false
    return
  }

  try {
    await ensureInit()

    // Try local cache first
    let post = getPostById(id)
    if (!post) {
      post = await loadPost(id)
    }

    // Permission check
    if (!user.value || (user.value.id !== post.author.id && !user.value.isAdmin)) {
      forbidden.value = '只有帖子作者或管理员可以编辑帖子。'
      isLoadingPost.value = false
      return
    }

    originalPost.value = post
    content.value = post.content

    // Focus editor after mount
    nextTick(() => {
      editorRef.value?.focus()
    })
  } catch (error: unknown) {
    forbidden.value = extractApiErrorMessage(error, '帖子加载失败，请稍后重试。')
  } finally {
    isLoadingPost.value = false
  }
}

async function handleSubmit() {
  errors.content = ''
  apiError.value = ''

  if (!content.value.trim()) {
    errors.content = '请输入内容'
    return
  }
  if (content.value.trim().length < 10) {
    errors.content = '内容至少需要 10 个字符'
    return
  }
  if (content.value === originalPost.value?.content) {
    apiError.value = '内容未发生变化，无需保存。'
    return
  }

  submitting.value = true
  try {
    await modifyPost(postId.value, content.value.trim())
    await navigateTo(`/forum/${postId.value}`)
  } catch (error: unknown) {
    apiError.value = extractApiErrorMessage(error, '保存失败，请稍后重试。')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}

watch(postId, () => {
  loadPostData()
}, { immediate: true })
</script>

<style scoped>
.post-editor__field-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted, #888);
  margin-top: 0.25rem;
}

.post-editor__diff-hint {
  background: var(--color-surface-2, #f0f4ff);
  border: 1px solid var(--color-primary, #4a90d9);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: var(--color-primary, #4a90d9);
}
</style>
