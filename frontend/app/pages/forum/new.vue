<template>
  <div class="post-editor-page">
    <!-- Header -->
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <NuxtLink to="/forum" class="post-editor__back">← 返回论坛</NuxtLink>
          <h1 class="page-header__title">✏️ 撰写帖子</h1>
          <p class="page-header__subtitle">
            分享你的技术见解、经验心得或提问求助。
          </p>
        </div>
      </ScrollReveal>
    </section>

    <!-- Editor form -->
    <section class="post-editor__content" data-transition-group="content">
      <div class="container">
        <div
          v-if="apiError"
          class="form-error form-error--global post-editor__error"
        >
          {{ apiError }}
        </div>

        <ScrollReveal>
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
                <span v-if="errors.title" class="form-error">{{
                  errors.title
                }}</span>
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
                  <option
                    v-for="cat in FORUM_CATEGORIES"
                    :key="cat.value"
                    :value="cat.value"
                  >
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
        </ScrollReveal>

        <ScrollReveal>
          <div class="page-tools" role="group" aria-label="正文模板" data-transition-group="content">
            <span>从模板开始：</span>
            <button
              v-for="item in postTemplates"
              :key="item.name"
              type="button"
              class="btn btn--outline btn--sm"
              :disabled="submitting || published"
              @click="applyTemplate(item.body)"
            >
              {{ item.name }}
            </button>
          </div>
        </ScrollReveal>
        <p
          class="draft-status"
          :class="{ 'form-error': draftFailed }"
          role="status"
        >
          {{ draftMessage }}
        </p>
        <!-- Markdown Editor -->
        <ScrollReveal>
          <div class="post-editor__editor-wrapper">
            <MarkdownEditor
              ref="editorRef"
              v-model="content"
              placeholder="开始写作…（支持 Markdown 语法）&#10;&#10;## 简介&#10;在这里写下你的想法…&#10;&#10;## 正文&#10;详细内容…"
            />
          </div>
        </ScrollReveal>

        <div
          v-if="errors.content"
          class="form-error post-editor__content-error"
        >
          {{ errors.content }}
        </div>

        <!-- Actions -->
        <ScrollReveal>
          <div class="post-editor__actions">
            <button
              type="button"
              class="btn btn--outline btn--lg"
              :disabled="submitting"
              @click="handleCancel"
            >
              ← 取消
            </button>
            <div class="post-editor__actions-right">
              <button
                type="button"
                class="btn btn--outline btn--lg"
                :disabled="submitting || published"
                @click="handleSaveDraft"
              >
                💾 存草稿
              </button>
              <button
                type="button"
                class="btn btn--primary btn--lg"
                :disabled="submitting || published"
                @click="handleSubmit"
              >
                {{ submitting ? '发布中…' : '🚀 发布帖子' }}
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ForumCategory } from '~~/shared/forum'
import { FORUM_CATEGORIES } from '~~/shared/forum'
import { useForum } from '~/composables/useForum'
import MarkdownEditor from '~/components/MarkdownEditor.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '撰写帖子 — DevBit Tech',
  description: '在 DevBit Tech 论坛发布技术帖子。',
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

const postTemplates = [
  {
    name: '提问求助',
    body: '## 我想实现什么\n\n## 运行环境\n\n## 复现步骤与错误信息\n\n## 已尝试的方法\n',
  },
  {
    name: '经验分享',
    body: '## 背景\n\n## 解决过程\n\n## 关键代码与注意事项\n\n## 总结与参考资料\n',
  },
  {
    name: '项目展示',
    body: '## 项目简介\n\n## 核心功能\n\n## 技术选择\n\n## 体验方式与下一步\n',
  },
]
function applyTemplate(body: string) {
  if (
    content.value.trim() &&
    !window.confirm('应用模板将替换当前正文，确定继续吗？')
  )
    return
  content.value = body
  editorRef.value?.focus()
}
const draftMessage = ref('尚未保存 · 草稿仅保存在此浏览器')
const draftFailed = ref(false)
const published = ref(false)
let savedSnapshot = ''
const draftSnapshot = () =>
  JSON.stringify({
    title: title.value,
    content: content.value,
    category: category.value,
    tags: tagsInput.value,
  })
watch(
  [title, content, category, tagsInput],
  () => {
    if (!published.value && draftSnapshot() !== savedSnapshot) {
      draftMessage.value = '有未保存的修改 · 每 10 秒自动保存到此浏览器'
      draftFailed.value = false
    }
  },
  { flush: 'sync' },
)

// Load draft from localStorage
onMounted(() => {
  try {
    const draft = localStorage.getItem('devbit_post_draft')
    if (draft) {
      const parsed = JSON.parse(draft)
      title.value = typeof parsed?.title === 'string' ? parsed.title : ''
      content.value = typeof parsed?.content === 'string' ? parsed.content : ''
      category.value =
        FORUM_CATEGORIES.find((c) => c.value === parsed?.category)?.value ??
        'general'
      tagsInput.value = typeof parsed?.tags === 'string' ? parsed.tags : ''
      savedSnapshot = draftSnapshot()
      draftMessage.value = '已恢复本地草稿'
    }
  } catch {
    draftFailed.value = true
    draftMessage.value = '无法读取本地草稿，请检查浏览器存储设置。'
  }

  editorRef.value?.focus()
})

// Keep failed storage writes visible; never report a false success.
const autoSaveDraft = () => {
  if (published.value) return true
  try {
    const snapshot = draftSnapshot()
    localStorage.setItem('devbit_post_draft', snapshot)
    savedSnapshot = snapshot
    draftFailed.value = false
    draftMessage.value =
      '已保存于 ' + new Date().toLocaleTimeString('zh-CN') + ' · 仅此浏览器'
    return true
  } catch {
    draftFailed.value = true
    draftMessage.value = '草稿保存失败，请保留页面并复制正文备份后重试。'
    return false
  }
}
let draftTimer: ReturnType<typeof setInterval> | null = null
function stopAutoSave() {
  if (draftTimer) clearInterval(draftTimer)
  draftTimer = null
}
onMounted(() => {
  draftTimer = setInterval(() => {
    if (
      !submitting.value &&
      draftSnapshot() !== savedSnapshot &&
      (title.value || content.value || tagsInput.value)
    )
      autoSaveDraft()
  }, 10000)
})
onUnmounted(stopAutoSave)
function handleSaveDraft() {
  autoSaveDraft()
}
function handleCancel() {
  if (
    !published.value &&
    (title.value || content.value || tagsInput.value) &&
    !autoSaveDraft()
  )
    return
  void navigateTo('/forum')
}

async function handleSubmit() {
  if (submitting.value || published.value) return
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
    .map((t) => t.trim())
    .filter(Boolean)

  submitting.value = true
  try {
    await createPost({
      title: title.value.trim(),
      content: content.value.trim(),
      category: category.value,
      tags,
    })
    published.value = true
    stopAutoSave()
    try {
      localStorage.removeItem('devbit_post_draft')
    } catch {
      draftFailed.value = true
      draftMessage.value =
        '帖子已发布，但本地草稿清理失败。请清理浏览器中的草稿，避免重复发布。'
      return
    }
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
