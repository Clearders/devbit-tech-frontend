import MarkdownIt from 'markdown-it'

// Tokens are never rendered to HTML. Vue displays the returned string as text.
const parser = new MarkdownIt({ html: true, breaks: true })
parser.inline.ruler.before('escape', 'excerpt_math', (state, silent) => {
  const match = state.src.slice(state.pos).match(/^(?:\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/)
  if (!match) return false
  if (!silent) { const token = state.push('text', '', 0); token.content = '〔公式〕' }
  state.pos += match[0].length
  return true
})
export function stripMarkdown(text: string, maxLength = 120): string {
  const clean = text.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
  const output: string[] = []
  const walk = (tokens: ReturnType<typeof parser.parse>) => {
    for (const token of tokens) {
      if (token.type === 'fence' || token.type === 'code_block' || token.type.startsWith('html_')) continue
      if (token.children && token.type !== 'image') walk(token.children)
      else if (['text', 'code_inline', 'image'].includes(token.type)) output.push(token.content.replace(/\+\+([^+]+)\+\+/g, '$1'))
      else if (['softbreak', 'hardbreak'].includes(token.type) || (token.block && token.nesting === -1)) output.push(' ')
    }
  }
  walk(parser.parse(clean, {}))
  const result = output.join('').replace(/\s+/g, ' ').trim()
  if (!result) return '查看完整内容'
  const characters = Array.from(result)
  return characters.length > maxLength ? characters.slice(0, maxLength).join('') + '…' : result
}
