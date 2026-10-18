import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const root = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..')
export function loadTs(path, globals = {}, { development = false } = {}) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file, exports)
    const source = readFileSync(file, 'utf8').replaceAll('import.meta.dev', String(development))
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    runInNewContext(compiled, {
      exports, Error, Promise, Set, Map, Date, Intl, Object, Array, JSON, Number, String, Math, RegExp, setTimeout, clearTimeout, console,
      require(name) {
        let target
        if (name.startsWith('.')) target = resolve(dirname(file), name)
        else if (name.startsWith('~/')) target = resolve(root, 'app', name.slice(2))
        else if (name.startsWith('~~/')) target = resolve(root, name.slice(3))
        if (target && existsSync(target + '.ts')) return load(target + '.ts')
        return require(name)
      }, ...globals,
    }, { filename: file })
    return exports
  }
  return load(resolve(root, path))
}
