/**
 * Strip markdown formatting for plain-text previews.
 * Used by post cards and other components that need excerpt generation.
 */
export function stripMarkdown(text: string, maxLength = 120): string {
  let result = text
    .replace(/\$\$[\s\S]*?\$\$/g, '')       // display math ($$...$$)
    .replace(/\$([^$\n]+?)\$/g, '$1')        // inline math ($...$) — keep the inner text
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
    .replace(/__([^_]+)__/g, '$1')       // bold
    .replace(/\*([^*]+)\*/g, '$1')       // italic
    .replace(/_([^_]+)_/g, '$1')         // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')  // inline code & code blocks
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/>\s/g, '')                 // blockquote
    .replace(/^[-*+]\s/gm, '')           // unordered lists
    .replace(/^\d+\.\s/gm, '')           // ordered lists
    .replace(/~~([^~]+)~~/g, '$1')       // strikethrough
    .replace(/\n{2,}/g, '\n')            // multiple newlines
    .replace(/\n/g, ' ')                 // newlines to spaces
    .replace(/\s{2,}/g, ' ')             // multiple spaces
    .trim()

  return result.length > maxLength ? result.slice(0, maxLength) + '\u2026' : result
}
