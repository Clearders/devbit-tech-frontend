<template>
  <div class="post-editor-page">
    <!-- Header -->
    <section class="page-header">
      <div class="container">
        <NuxtLink to="/forum" class="post-editor__back">← 返回论坛</NuxtLink>
        <h1 class="page-header__title">✏️ 撰写帖子</h1>
        <p class="page-header__subtitle">
          分享你的技术见解、经验心得或提问求助。
        </p>
      </div>
    </section>

    <!-- Editor form -->
    <section class="post-editor__content">
      <div class="container">
        <div v-if="apiError" class="form-error form-error--global post-editor__error">
          {{ apiError }}
        </div>

        <div class="post-editor__meta">
          <div class="form-group post-editor__title-group">
            <label class="form-label" for="post-title">标题</label>
            <input
              id="post-title"
              v-model="title"
              type="text"
              class="form-control post-editor__title-input"
              :class="{ 'form-control--error': errors.title }"
              placeholder="起一个吸引人的标题…"
              maxlength="100"
            />
            <div class="post-editor__title-meta">
              <span v-if="errors.title" class="form-error">{{ errors.title }}</span>
              <span class="post-editor__char-hint">{{ title.length }}/100</span>
            </div>
          </div>

          <div class="post-editor__meta-row">
            <div class="form-group">
              <label class="form-label" for="post-category">分类</label>
              <select
                id="post-category"
                v-model="category"
                class="form-control"
              >
                <option v-for="cat in FORUM_CATEGORIES" :key="cat.value" :value="cat.value">
                  {{ cat.icon }} {{ cat.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="post-tags">标签（逗号分隔）</label>
              <input
                id="post-tags"
                v-model="tagsInput"
                type="text"
                class="form-control"
                placeholder="例如：Rust, 前端, 教程"
              />
            </div>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div class="post-editor__editor-wrapper">
          <MarkdownEditor
            ref="editorRef"
            v-model="content"
            placeholder="开始写作…（支持 Markdown 语法）&#10;&#10;## 简介&#10;在这里写下你的想法…&#10;&#10;## 正文&#10;详细内容…"
          />
        </div>

        <div v-if="errors.content" class="form-error post-editor__content-error">
          {{ errors.content }}
        </div>

        <!-- Actions -->
        <div class="post-editor__actions">
          <button type="button" class="btn btn--outline btn--lg" @click="handleCancel">
            ← 取消
          </button>
          <div class="post-editor__actions-right">
            <button
              type="button"
              class="btn btn--outline btn--lg"
              @click="handleSaveDraft"
            >
              💾 存草稿
            </button>
            <button
              type="button"
              class="btn btn--primary btn--lg"
              :disabled="submitting"
              @click="handleSubmit"
            >
              {{ submitting ? '发布中…' : '🚀 发布帖子' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ForumCategory } from '~/composables/useForum'
import { useForum, FORUM_CATEGORIES } from '~/composables/useForum'
import MarkdownEditor from '~/components/MarkdownEditor.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '撰写帖子 — DevBit Tech',
  description: '在 DevBit Tech 论坛发布技术帖子。'
})

const { isAuthenticated } = useAuth()
const { createPost } = useForum()

const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)
const title = ref('')
const content = ref('')
const category = ref<ForumCategory>('general')
const tagsInput = ref('')
const submitting = ref(false)
const apiError = ref('')
const errors = reactive({ title: '', content: '' })

// Redirect if not authenticated
if (!isAuthenticated.value) {
  await navigateTo('/login')
}

// Load draft from localStorage
onMounted(() => {
  try {
    const draft = localStorage.getItem('devbit_post_draft')
    if (draft) {
      const parsed = JSON.parse(draft)
      title.value = parsed.title || ''
      content.value = parsed.content || ''
      category.value = parsed.category || 'general'
      tagsInput.value = parsed.tags || ''
    }
  } catch { /* ignore */ }

  editorRef.value?.focus()
})

// Auto-save draft
const autoSaveDraft = () => {
  try {
    const draft = {
      title: title.value,
      content: content.value,
      category: category.value,
      tags: tagsInput.value,
    }
    localStorage.setItem('devbit_post_draft', JSON.stringify(draft))
  } catch { /* ignore */ }
}

let draftTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  draftTimer = setInterval(autoSaveDraft, 10000) // every 10s
})
onUnmounted(() => {
  if (draftTimer) clearInterval(draftTimer)
})

function clearDraft() {
  localStorage.removeItem('devbit_post_draft')
}

function handleSaveDraft() {
  autoSaveDraft()
  // Brief visual feedback — could use a toast
  const btn = document.activeElement as HTMLElement | null
  if (btn) {
    const orig = btn.textContent
    btn.textContent = '✅ 已保存'
    setTimeout(() => { btn.textContent = orig }, 1500)
  }
}

function handleCancel() {
  if (title.value || content.value || tagsInput.value) {
    // Save as draft before leaving
    autoSaveDraft()
  }
  navigateTo('/forum')
}

async function handleSubmit() {
  errors.title = ''
  errors.content = ''
  apiError.value = ''

  let valid = true
  if (!title.value.trim()) {
    errors.title = '请输入标题'
    valid = false
  } else if (title.value.trim().length < 2) {
    errors.title = '标题至少需要 2 个字符'
    valid = false
  }

  if (!content.value.trim()) {
    errors.content = '请输入内容'
    valid = false
  } else if (content.value.trim().length < 10) {
    errors.content = '内容至少需要 10 个字符'
    valid = false
  }

  if (!valid) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  submitting.value = true
  try {
    await createPost({
      title: title.value.trim(),
      content: content.value.trim(),
      category: category.value,
      tags,
    })
    clearDraft()
    await navigateTo('/forum')
  } catch (error: unknown) {
    apiError.value = extractApiErrorMessage(error, '发布失败，请稍后重试。')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Styles are in main.css */
</style>
