<template>
  <div class="markdown-renderer" v-html="renderedHtml" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const props = withDefaults(defineProps<{
  content: string
  inline?: boolean
}>(), {
  content: '',
  inline: false,
})

// Create a markdown-it instance with safe defaults
// html: false prevents raw HTML injection
// linkify: true auto-converts URLs to links
// breaks: true converts \n to <br> (GFM style)
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
})

const renderedHtml = computed(() => {
  if (!props.content) return ''
  if (props.inline) {
    return md.renderInline(props.content)
  }
  return md.render(props.content)
})
</script>

<style scoped>
.markdown-renderer {
  word-break: break-word;
  overflow-wrap: break-word;
  color: var(--color-text);
  line-height: 1.7;
}

/* Headings */
.markdown-renderer :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  line-height: 1.3;
  color: var(--color-text);
}

.markdown-renderer :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.25rem 0 0.625rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border);
  line-height: 1.35;
  color: var(--color-text);
}

.markdown-renderer :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  line-height: 1.4;
  color: var(--color-text);
}

.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.875rem 0 0.5rem;
  line-height: 1.45;
  color: var(--color-text);
}

/* Paragraphs */
.markdown-renderer :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.7;
}

.markdown-renderer :deep(p:first-child) {
  margin-top: 0;
}

.markdown-renderer :deep(p:last-child) {
  margin-bottom: 0;
}

/* Inline code */
.markdown-renderer :deep(code) {
  background: var(--color-surface-soft, #1d2331);
  color: #f472b6;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-family: var(--font-mono, 'JetBrains Mono', 'Cascadia Code', Consolas, monospace);
  font-size: 0.875em;
  word-break: break-word;
}

/* Code blocks */
.markdown-renderer :deep(pre) {
  background: #0f1219;
  color: #e2e8f0;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.75rem 0;
  line-height: 1.6;
  border: 1px solid var(--color-border);
}

.markdown-renderer :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
  font-size: 0.875rem;
}

/* Blockquotes */
.markdown-renderer :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding: 0.5rem 1rem;
  margin: 0.75rem 0;
  background: var(--color-surface-soft, #1d2331);
  color: var(--color-text-muted);
  border-radius: 0 6px 6px 0;
}

.markdown-renderer :deep(blockquote p) {
  margin: 0.25rem 0;
}

/* Lists */
.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.markdown-renderer :deep(li) {
  margin: 0.25rem 0;
  line-height: 1.65;
}

/* Task lists */
.markdown-renderer :deep(li input[type="checkbox"]) {
  margin-right: 0.5rem;
  accent-color: var(--color-primary);
}

/* Links */
.markdown-renderer :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-renderer :deep(a:hover) {
  color: var(--color-accent);
}

/* Images */
.markdown-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5rem 0;
}

/* Horizontal rules */
.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.25rem 0;
}

/* Tables */
.markdown-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.9375rem;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-renderer :deep(th) {
  background: var(--color-surface-soft, #1d2331);
  font-weight: 600;
}

.markdown-renderer :deep(tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.02);
}

/* Strikethrough */
.markdown-renderer :deep(del) {
  color: var(--color-text-muted);
}

/* Emphasis */
.markdown-renderer :deep(strong) {
  font-weight: 700;
}

.markdown-renderer :deep(em) {
  font-style: italic;
}
</style>
