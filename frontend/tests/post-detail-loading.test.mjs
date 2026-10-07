import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { computed, reactive, ref } from 'vue'
import ts from 'typescript'

const source = readFileSync(new URL('../app/pages/forum/[id].vue', import.meta.url), 'utf8')
  .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const compiled = ts.transpileModule(source + '\nexport const loadingTest = { isLoadingPost, post }', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup(cached = false) {
  const route = reactive({ params: { id: '1' } })
  const post = { id: 1, title: 'Cached title', content: 'Post content', category: 'tech',
    author: { id: 1, name: 'Author' }, tags: [], createdAt: '', updatedAt: '' }
  const posts = ref(cached ? [post] : [])
  const mounted = [], watchers = [], calls = [], exports = {}
  const forum = {
    posts,
    getPostById: id => posts.value.find(item => item.id === id),
    getCommentsByPostId: () => [],
    async ensureInit() { calls.push('bootstrap'); posts.value = [post] },
    async loadPost(id) { calls.push(['post', id]) },
    async loadCommentsForPost(id) { calls.push(['comments', id]) },
  }
  runInNewContext(compiled, {
    exports, ref, computed,
    require: name => name === '~/utils/forum' ? { getForumCategory: () => ({ label: '技术实践' }) }
      : name === '~/utils/extractApiErrorMessage' ? { extractApiErrorMessage: (_error, fallback) => fallback }
      : name === '~/composables/useForum' ? { useForum: () => forum }
      : {},
    useSeoMeta() {}, useRoute: () => route,
    useAuth: () => ({ user: ref({ id: 1 }), isAuthenticated: ref(true) }),
    onMounted: callback => mounted.push(callback),
    watch: (source, callback, options) => { watchers.push(callback); if (options?.immediate) callback(source.value) },
    watchEffect: callback => callback(),
  })
  return { ...exports.loadingTest, mounted, watchers, calls, route }
}

test('direct-link setup leaves loading HTML and serialized post data in sync until mount', async () => {
  const app = setup()
  assert.deepEqual(app.calls, [], 'setup must not start an unawaited SSR refresh')
  assert.equal(app.isLoadingPost.value, true)
  assert.equal(app.post.value, undefined)
  app.mounted.forEach(callback => callback())
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(app.calls, ['bootstrap', ['post', 1], ['comments', 1]])
  assert.equal(app.isLoadingPost.value, false)
  assert.equal(app.post.value.title, 'Cached title')
})

test('entering from a cached list keeps the body visible and route-param changes still refresh', async () => {
  const app = setup(true)
  assert.equal(app.isLoadingPost.value, false)
  app.mounted.forEach(callback => callback())
  assert.equal(app.isLoadingPost.value, false, 'cached content should not flash back to a skeleton')
  await new Promise(resolve => setImmediate(resolve))
  app.route.params.id = '2'
  app.watchers.at(-1)(2)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(app.calls.slice(-3), ['bootstrap', ['post', 2], ['comments', 2]])
  assert.equal(app.isLoadingPost.value, false)
})
