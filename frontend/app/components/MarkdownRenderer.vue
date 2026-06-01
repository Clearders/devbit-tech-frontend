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
  line-height: 1.75;
}

/* Headings */
.markdown-renderer :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-light, #eeebe7);
  line-height: 1.3;
  color: var(--color-text);
}

.markdown-renderer :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.25rem 0 0.625rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border-light, #eeebe7);
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
  line-height: 1.75;
}

.markdown-renderer :deep(p:first-child) {
  margin-top: 0;
}

.markdown-renderer :deep(p:last-child) {
  margin-bottom: 0;
}

/* Inline code */
.markdown-renderer :deep(code) {
  background: var(--color-bg-soft, #f0ede9);
  color: #d6517a;
  border: 1px solid var(--color-border-light, #eeebe7);
  border-radius: 0.3rem;
  padding: 0.15em 0.4em;
  font-size: 0.9em;
  font-family: var(--font-mono), monospace;
}

/* Code blocks */
.markdown-renderer :deep(pre) {
  background: var(--color-bg-soft, #f0ede9);
  border: 1px solid var(--color-border-light, #eeebe7);
  border-radius: 0.625rem;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}

.markdown-renderer :deep(pre) code {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text);
  font-size: 0.88rem;
  line-height: 1.55;
}

/* Blockquote */
.markdown-renderer :deep(blockquote) {
  border-left: 3px solid var(--color-primary, #5b8def);
  background: rgba(91, 141, 239, 0.04);
  padding: 0.5rem 1rem;
  margin: 0.75rem 0;
  border-radius: 0 0.4rem 0.4rem 0;
  color: var(--color-text-secondary);
}

.markdown-renderer :deep(blockquote) p {
  margin: 0.25rem 0;
}

/* Lists */
.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.markdown-renderer :deep(li) {
  margin: 0.2rem 0;
}

/* Links */
.markdown-renderer :deep(a) {
  color: var(--color-primary, #5b8def);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-renderer :deep(a:hover) {
  color: var(--color-primary-dark, #4a7adf);
}

/* Tables */
.markdown-renderer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75rem 0;
  border: 1px solid var(--color-border-light, #eeebe7);
  border-radius: 0.5rem;
  overflow: hidden;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  border: 1px solid var(--color-border-light, #eeebe7);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-renderer :deep(th) {
  background: var(--color-bg-soft, #f0ede9);
  font-weight: 600;
}

.markdown-renderer :deep(tr:nth-child(even)) {
  background: rgba(0, 0, 0, 0.015);
}

/* Horizontal rule */
.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border-light, #eeebe7);
  margin: 1.25rem 0;
}

/* Images */
.markdown-renderer :deep(img) {
  border-radius: 0.5rem;
  max-width: 100%;
}
</style>
