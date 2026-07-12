declare module 'markdown-it-texmath' {
  import MarkdownIt = require('markdown-it')

  const texmath: MarkdownIt.PluginWithOptions<Record<string, unknown>>
  export default texmath
}
