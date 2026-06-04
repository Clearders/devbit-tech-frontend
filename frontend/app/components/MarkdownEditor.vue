<template>
  <div class="md-editor" :class="{ 'md-editor--split': showPreview }">
    <!-- Toolbar -->
    <div class="md-editor__toolbar">
      <div class="md-editor__toolbar-group">
        <button
          v-for="btn in headingButtons"
          :key="btn.label"
          class="md-editor__btn"
          :title="btn.label"
          @click="insertHeading(btn.level)"
          type="button"
        >{{ btn.icon }}</button>
      </div>
      <div class="md-editor__toolbar-divider" />
      <div class="md-editor__toolbar-group">
        <button
          v-for="btn in inlineButtons"
          :key="btn.label"
          class="md-editor__btn"
          :title="btn.label"
          @click="wrapSelection(btn.syntax)"
          type="button"
        >{{ btn.icon }}</button>
      </div>
      <div class="md-editor__toolbar-divider" />
      <div class="md-editor__toolbar-group">
        <button
          class="md-editor__btn"
          title="代码块"
          @click="insertCodeBlock"
          type="button"
        >📋</button>
        <button
          class="md-editor__btn"
          title="引用"
          @click="prefixLines('> ')"
          type="button"
        >💬</button>
        <button
          class="md-editor__btn"
          title="无序列表"
          @click="prefixLines('- ')"
          type="button"
        >•≡</button>
        <button
          class="md-editor__btn"
          title="有序列表"
          @click="prefixLines('1. ')"
          type="button"
        >1≡</button>
        <button
          class="md-editor__btn"
          title="分割线"
          @click="insertBlock('---')"
          type="button"
        >—</button>
      </div>
      <div class="md-editor__toolbar-divider" />
      <div class="md-editor__toolbar-group">
        <button
          class="md-editor__btn"
          title="链接"
          @click="insertLink"
          type="button"
        >🔗</button>
        <button
          class="md-editor__btn"
          title="图片"
          @click="insertImage"
          type="button"
        >🖼</button>
      </div>
      <div class="md-editor__toolbar-spacer" />
      <div class="md-editor__toolbar-group">
        <button
          class="md-editor__btn md-editor__btn--toggle"
          :class="{ 'md-editor__btn--active': showPreview }"
          :title="showPreview ? '关闭预览' : '开启预览'"
          @click="showPreview = !showPreview"
          type="button"
        >
          {{ showPreview ? '👁‍🗨 隐藏预览' : '👁 预览' }}
        </button>
      </div>
    </div>

    <!-- Editor area -->
    <div class="md-editor__area">
      <div class="md-editor__input-wrapper">
        <textarea
          ref="textareaRef"
          :value="modelValue"
          @input="onInput"
          @keydown="onKeydown"
          @scroll="syncScroll"
          class="md-editor__textarea"
          :placeholder="placeholder"
          rows="1"
        ></textarea>
      </div>
      <div
        v-if="showPreview"
        class="md-editor__preview"
        ref="previewRef"
        @scroll="syncPreviewScroll"
      >
        <div class="md-editor__preview-inner">
          <MarkdownRenderer :content="modelValue || '_暂无内容_'" />
        </div>
      </div>
    </div>

    <!-- Status bar -->
    <div class="md-editor__status">
      <span>{{ charCount }} 字</span>
      <span>{{ lineCount }} 行</span>
      <span class="md-editor__status-hint">支持 Markdown 语法 · Ctrl+B 加粗 · Ctrl+I 斜体 · Ctrl+U 下划线</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: '开始写作…（支持 Markdown 语法）',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const showPreview = ref(true)
let isSyncing = false

// Toolbar button definitions
const headingButtons = [
  { level: 1, label: '一级标题 (H1)', icon: 'H1' },
  { level: 2, label: '二级标题 (H2)', icon: 'H2' },
  { level: 3, label: '三级标题 (H3)', icon: 'H3' },
]

const inlineButtons = [
  { syntax: '**', label: '加粗 (Ctrl+B)', icon: '𝐁' },
  { syntax: '*', label: '斜体 (Ctrl+I)', icon: '𝐼' },
  { syntax: '++', label: '下划线 (Ctrl+U)', icon: 'U̲' },
  { syntax: '~~', label: '删除线', icon: 'S̶' },
  { syntax: '`', label: '行内代码', icon: '<>' },
]

// Computed
const charCount = computed(() => props.modelValue.length)
const lineCount = computed(() => props.modelValue.split('\n').length)

// --- Textarea manipulation helpers ---
function getTextarea(): HTMLTextAreaElement | null {
  return textareaRef.value
}

function getSelection(): { start: number; end: number; text: string } | null {
  const ta = getTextarea()
  if (!ta) return null
  return {
    start: ta.selectionStart,
    end: ta.selectionEnd,
    text: ta.value.substring(ta.selectionStart, ta.selectionEnd),
  }
}

function replaceText(start: number, end: number, replacement: string) {
  const ta = getTextarea()
  if (!ta) return
  const val = props.modelValue
  const newVal = val.substring(0, start) + replacement + val.substring(end)
  emit('update:modelValue', newVal)
  // Restore cursor after Vue re-render
  nextTick(() => {
    if (!ta) return
    const cursorPos = start + replacement.length
    ta.focus()
    ta.setSelectionRange(cursorPos, cursorPos)
  })
}

function insertAtCursor(text: string) {
  const sel = getSelection()
  if (!sel) {
    // append at end
    emit('update:modelValue', props.modelValue + text)
    return
  }
  replaceText(sel.start, sel.end, text)
}

// --- Toolbar actions ---
function wrapSelection(syntax: string) {
  const sel = getSelection()
  if (!sel) return
  const hasSelection = sel.start !== sel.end

  if (hasSelection) {
    replaceText(sel.start, sel.end, syntax + sel.text + syntax)
  } else {
    // Wrap current word or insert placeholder
    const ta = getTextarea()
    if (!ta) return
    const val = props.modelValue
    // Find word boundaries around cursor
    let wordStart = sel.start
    let wordEnd = sel.end
    const nonWord = /\s/
    while (wordStart > 0 && !nonWord.test(val.charAt(wordStart - 1))) wordStart--
    while (wordEnd < val.length && !nonWord.test(val.charAt(wordEnd))) wordEnd++

    if (wordStart !== wordEnd) {
      const word = val.substring(wordStart, wordEnd)
      replaceText(wordStart, wordEnd, syntax + word + syntax)
    } else {
      const placeholder = syntax === '`' ? '代码' : syntax === '++' ? '下划线' : syntax === '~~' ? '删除线' : syntax === '**' ? '加粗' : '文本'
      replaceText(sel.start, sel.end, syntax + placeholder + syntax)
      // Select placeholder for easy overwrite
      nextTick(() => {
        if (!ta) return
        const newStart = sel.start + syntax.length
        const newEnd = newStart + placeholder.length
        ta.setSelectionRange(newStart, newEnd)
      })
    }
  }
}

function insertHeading(level: number) {
  const prefix = '#'.repeat(level) + ' '
  const ta = getTextarea()
  if (!ta) return
  const val = props.modelValue

  // Find start of current line
  let lineStart = ta.selectionStart
  while (lineStart > 0 && val.charAt(lineStart - 1) !== '\n') lineStart--

  // Find end of current line
  let lineEnd = ta.selectionEnd
  while (lineEnd < val.length && val.charAt(lineEnd) !== '\n') lineEnd++

  // Check if line already has a heading prefix
  const line = val.substring(lineStart, lineEnd)
  const existingMatch = line.match(/^(#{1,6})\s/)
  const rest = existingMatch ? line.slice(existingMatch[0].length) : line

  replaceText(lineStart, lineEnd, prefix + rest)
}

function prefixLines(prefix: string) {
  const sel = getSelection()
  if (!sel) return
  const ta = getTextarea()
  if (!ta) return
  const val = props.modelValue

  // Find full lines of selection
  let lineStart = sel.start
  while (lineStart > 0 && val.charAt(lineStart - 1) !== '\n') lineStart--
  let lineEnd = sel.end
  while (lineEnd < val.length && val.charAt(lineEnd) !== '\n') lineEnd++

  const selectedLines = val.substring(lineStart, lineEnd)
  const prefixed = selectedLines
    .split('\n')
    .map(l => prefix + l)
    .join('\n')

  replaceText(lineStart, lineEnd, prefixed)
}

function insertBlock(syntax: string) {
  const sel = getSelection()
  if (!sel) return
  const prefix = sel.start === 0 || props.modelValue.charAt(sel.start - 1) === '\n' ? '' : '\n'
  const suffix = sel.end === props.modelValue.length || props.modelValue.charAt(sel.end) === '\n' ? '' : '\n'
  replaceText(sel.start, sel.end, prefix + syntax + '\n' + suffix)
}

function insertCodeBlock() {
  const sel = getSelection()
  if (!sel) return
  if (sel.start !== sel.end) {
    replaceText(sel.start, sel.end, '\n```\n' + sel.text + '\n```\n')
  } else {
    replaceText(sel.start, sel.end, '\n```\n代码块\n```\n')
  }
}

function insertLink() {
  const sel = getSelection()
  if (!sel) return
  if (sel.start !== sel.end) {
    replaceText(sel.start, sel.end, '[' + sel.text + '](url)')
    // Select "url" for easy replacement
    nextTick(() => {
      const ta = getTextarea()
      if (!ta) return
      const urlStart = sel.start + sel.text.length + 3
      const urlEnd = urlStart + 3
      ta.setSelectionRange(urlStart, urlEnd)
    })
  } else {
    replaceText(sel.start, sel.end, '[链接文字](https://)')
    nextTick(() => {
      const ta = getTextarea()
      if (!ta) return
      ta.setSelectionRange(sel.start + 1, sel.start + 5)
    })
  }
}

function insertImage() {
  const sel = getSelection()
  if (!sel) return
  if (sel.start !== sel.end) {
    replaceText(sel.start, sel.end, '![' + sel.text + '](url)')
  } else {
    replaceText(sel.start, sel.end, '![图片描述](https://)')
    nextTick(() => {
      const ta = getTextarea()
      if (!ta) return
      ta.setSelectionRange(sel.start + 2, sel.start + 6)
    })
  }
}

// --- Keyboard shortcuts ---
function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return

  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault()
    wrapSelection('**')
  } else if (e.key === 'i' || e.key === 'I') {
    e.preventDefault()
    wrapSelection('*')
  } else if (e.key === 'u' || e.key === 'U') {
    e.preventDefault()
    wrapSelection('++')
  } else if (e.key === 'k' || e.key === 'K') {
    e.preventDefault()
    insertLink()
  }
}

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

// --- Scroll sync ---
let scrollTimer: ReturnType<typeof setTimeout> | null = null

function syncScroll() {
  if (!showPreview.value || isSyncing) return
  isSyncing = true
  const ta = getTextarea()
  const preview = previewRef.value
  if (!ta || !preview) { isSyncing = false; return }

  const ratio = ta.scrollTop / Math.max(ta.scrollHeight - ta.clientHeight, 1)
  preview.scrollTop = ratio * Math.max(preview.scrollHeight - preview.clientHeight, 1)

  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { isSyncing = false }, 50)
}

function syncPreviewScroll() {
  if (!showPreview.value || isSyncing) return
  isSyncing = true
  const ta = getTextarea()
  const preview = previewRef.value
  if (!ta || !preview) { isSyncing = false; return }

  const ratio = preview.scrollTop / Math.max(preview.scrollHeight - preview.clientHeight, 1)
  ta.scrollTop = ratio * Math.max(ta.scrollHeight - ta.clientHeight, 1)

  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { isSyncing = false }, 50)
}

// Expose focus method
function focus() {
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

defineExpose({ focus })
</script>

<style scoped>
/* Styles are in main.css to share with forum page styling */
</style>
