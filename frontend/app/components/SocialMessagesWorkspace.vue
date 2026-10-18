<script setup lang="ts">
import { MessageSquare, Users, Search, ArrowLeft, MoreHorizontal, Pin, BellOff, Archive, X, Smile, Paperclip, Send, ChevronDown, File, ArrowUpRight, Trash2, Info } from '@lucide/vue'
import { attachment, messagePreview } from '~/utils/socialWorkspace'
import { formatRelativeTime } from '~/utils/forum'
import { EMOJI_CATEGORIES, searchEmoji } from '~/utils/emojiData'
import type { WorkspaceMessage } from '~~/shared/social'
const props = defineProps<{ userId?: number }>()
const { state, api, refresh, loadConversations, loadHistory, loadProfile, send, markRead, run } = useSocialWorkspace()
const { user } = useAuth(), { status: connection } = useWebSocket()
const query = ref(''), filter = ref<'all' | 'unread' | 'archived'>('all'), showProfile = ref(false), showMenu = ref(false), showEmoji = ref(false), emojiQuery = ref('')
const scroll = ref<HTMLElement>(), input = ref<HTMLTextAreaElement>(), fileInput = ref<HTMLInputElement>(), imageDialog = ref<HTMLDialogElement>(), imagePreview = ref(''), clearConfirmation = ref(false)
const atBottom = ref(true), newMessages = ref(0), fileError = ref(''), readingFiles = ref(false)
let loadingOlder = false, olderSerial = 0, serial = 0, disposed = false, activated = false
let historyResize: ResizeObserver | undefined
const id = computed(() => props.userId ?? 0)
const member = computed(() => state.value.profiles[id.value] ?? state.value.members[id.value])
const conversation = computed(() => state.value.conversations.find(c => c.user.id === id.value))
const conversations = computed(() => state.value.conversations.filter(c => (filter.value === 'archived' ? c.preferences.archived : !c.preferences.archived) && (filter.value !== 'unread' || c.unread > 0) && c.user.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())).sort((a, b) => Number(b.preferences.pinned) - Number(a.preferences.pinned) || (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? '')))
const messages = computed(() => state.value.messages.filter(m => m.sender.id === id.value || m.recipient.id === id.value))
const outbox = computed(() => state.value.outbox.filter(m => m.recipientId === id.value))
const draft = computed({ get: () => state.value.drafts[id.value] ?? '', set: value => { state.value.drafts[id.value] = value } })
const attachments = computed(() => state.value.draftAttachments[id.value] ?? [])
const emojis = computed(() => emojiQuery.value ? searchEmoji(emojiQuery.value).slice(0, 64) : EMOJI_CATEGORIES.flatMap(c => c.emojis).slice(0, 64))
const canSend = computed(() => !!member.value?.canMessage && id.value !== user.value?.id)
const today = (date: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date(date))
const clock = (date: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(date))
function newDay(index: number) { return index === 0 || today(messages.value[index]!.createdAt) !== today(messages.value[index - 1]!.createdAt) }
function grouped(index: number) { if (!index || newDay(index)) return false; const a = messages.value[index - 1]!, b = messages.value[index]!; return a.sender.id === b.sender.id && Date.parse(b.createdAt) - Date.parse(a.createdAt) < 300000 }
function scrollToLatest() { if (scroll.value) scroll.value.scrollTop = scroll.value.scrollHeight; newMessages.value = 0; atBottom.value = true; if (id.value && document.visibilityState === 'visible') void markRead(id.value) }
function onScroll() { if (!scroll.value) return; atBottom.value = scroll.value.scrollHeight - scroll.value.scrollTop - scroll.value.clientHeight < 72; if (atBottom.value) { newMessages.value = 0; if (conversation.value?.unread && document.visibilityState === 'visible') void markRead(id.value) } }
async function openConversation() {
  const ticket = ++serial, partner = id.value
  olderSerial++; loadingOlder = false
  showProfile.value = false; showMenu.value = false; showEmoji.value = false; clearConfirmation.value = false
  imageDialog.value?.close(); fileError.value = ''; newMessages.value = 0; atBottom.value = true
  if (!partner) return
  if (partner === user.value?.id) return
  const pending = Promise.all([loadHistory(partner), loadProfile(partner)])
  await nextTick()
  if (ticket !== serial || disposed) return
  scrollToLatest()
  await pending
  if (ticket !== serial || disposed) return
  await nextTick(); if (atBottom.value) scrollToLatest()
}
watch(id, openConversation)
watch(scroll, node => {
  historyResize?.disconnect()
  if (!node || disposed || typeof ResizeObserver === 'undefined') return
  historyResize ??= new ResizeObserver(() => { if (atBottom.value && !loadingOlder) void nextTick().then(() => { if (!disposed) scrollToLatest() }) })
  historyResize.observe(node)
}, { flush: 'post' })
watch(() => messages.value.map(m => m.id).join(','), async (_, old) => {
  if (loadingOlder || !activated || disposed) return
  const oldIds = new Set((old ?? '').split(',').map(Number)), added = messages.value.filter(m => !oldIds.has(m.id))
  if (!added.length) return
  if (atBottom.value) { await nextTick(); scrollToLatest() }
  else newMessages.value += added.filter(m => m.sender.id !== user.value?.id).length
})
watch(() => outbox.value.length, async () => { if (atBottom.value) { await nextTick(); scrollToLatest() } })
async function older() {
  const node = scroll.value, partner = id.value, ticket = ++olderSerial
  if (!node) return
  loadingOlder = true
  const height = node.scrollHeight, top = node.scrollTop
  try {
    await loadHistory(partner, true); await nextTick()
    if (ticket === olderSerial && partner === id.value && !disposed && node === scroll.value) node.scrollTop = top + node.scrollHeight - height
  } finally { if (ticket === olderSerial) loadingOlder = false }
}
function handleEnter(e: KeyboardEvent) { if (e.shiftKey || e.isComposing || e.keyCode === 229) return; e.preventDefault(); void submit() }
async function submit() {
  if (!canSend.value || readingFiles.value) return
  const partner = id.value, owner = user.value?.id, text = draft.value.trim(), files = [...attachments.value]
  if (!text && !files.length) return
  draft.value = ''; state.value.draftAttachments[partner] = []; showEmoji.value = false; atBottom.value = true
  if (text) await send(partner, text)
  for (const file of files) { if (disposed || owner !== user.value?.id) break; await send(partner, file.content) }
  await nextTick(); if (partner === id.value) scrollToLatest()
}
async function addFiles(files: File[]) {
  const partner = id.value, owner = user.value?.id; fileError.value = ''; readingFiles.value = true
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { fileError.value = '文件过大，单个文件最多 10MB。'; continue }
      if ((state.value.draftAttachments[partner]?.length ?? 0) >= 5) { fileError.value = '每次最多添加 5 个附件。'; break }
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      if (disposed || owner !== user.value?.id) return
      const image = /^image\/(png|jpeg|gif|webp|avif|bmp)$/i.test(file.type), name = file.name.replace(/[\[\]()\r\n]/g, '_'), url = data.replace(/^data:;base64,/, 'data:application/octet-stream;base64,')
      const content = `${image ? '!' : ''}[${name}](${url})`
      state.value.draftAttachments[partner] ??= []
      state.value.draftAttachments[partner]!.push({ name, content, image, url })
    }
  } catch { fileError.value = '附件读取失败，请重新选择。' } finally { if (!disposed && owner === user.value?.id) readingFiles.value = false }
}
function onFile(e: Event) { const node = e.target as HTMLInputElement; void addFiles(Array.from(node.files ?? [])); node.value = '' }
function onPaste(e: ClipboardEvent) { const files = Array.from(e.clipboardData?.items ?? []).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter((f): f is File => !!f); if (files.length) { e.preventDefault(); void addFiles(files) } }
function removeFile(index: number) { state.value.draftAttachments[id.value]?.splice(index, 1) }
function emoji(char: string) { draft.value += char; showEmoji.value = false; input.value?.focus() }
async function preference(key: 'pinned' | 'muted' | 'archived') { const partner = id.value; showMenu.value = false; await run(`conversation:${partner}`, s => s.updateConversation(partner, { [key]: !conversation.value?.preferences[key] }), '会话偏好已更新') }
async function clearHistory() { const partner = id.value; const ok = await run(`clear:${partner}`, s => s.clearHistory(partner), '我的会话历史已清除'); if (ok) { state.value.messages = state.value.messages.filter(m => m.sender.id !== partner && m.recipient.id !== partner); state.value.histories[partner] = { loaded: true, cursor: null }; clearConfirmation.value = false; await loadConversations() } }
async function preview(url: string) { imagePreview.value = url; await nextTick(); imageDialog.value?.showModal() }
function onVisibility() { if (document.visibilityState === 'visible' && id.value && atBottom.value) void markRead(id.value) }
function dismissPopovers(event: MouseEvent) { const target = event.target as HTMLElement; if (!target.closest('.soc-chat-menu')) showMenu.value = false; if (!target.closest('.soc-emoji')) showEmoji.value = false }
onMounted(async () => {
  document.addEventListener('visibilitychange', onVisibility); document.addEventListener('click', dismissPopovers)
  await Promise.all([refresh(), loadConversations()]); if (disposed) return; activated = true; await openConversation()
})
onBeforeUnmount(() => { disposed = true; serial++; historyResize?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); document.removeEventListener('click', dismissPopovers) })
</script>
<template>
  <div class="soc-page soc-messages-page">
    <h1 class="sr-only">私信</h1>
    <p v-if="api.mode !== 'mock' && connection !== 'connected'" class="soc-connection" role="status">实时连接暂未就绪。消息仍可发送，恢复连接后会重新同步。<button class="soc-text-action" @click="loadConversations(); id && loadHistory(id)">刷新消息</button></p>
    <div class="soc-messenger" :class="{ 'soc-messenger--chat': id, 'soc-messenger--profile': showProfile }">
      <aside class="soc-conversations"><header><h2>会话</h2><NuxtLink to="/friends?view=discover" class="soc-icon" aria-label="寻找成员开始聊天"><MessageSquare :size="19" /></NuxtLink></header><label class="soc-search"><Search :size="17" aria-hidden="true" /><span class="sr-only">搜索会话</span><input v-model="query" placeholder="搜索会话…"></label><div class="soc-segments soc-conversation-filters" aria-label="会话筛选"><button :aria-pressed="filter === 'all'" @click="filter = 'all'">全部</button><button :aria-pressed="filter === 'unread'" @click="filter = 'unread'">未读</button><button :aria-pressed="filter === 'archived'" @click="filter = 'archived'">归档</button></div><div class="soc-conversations__list"><div v-if="state.errors.conversations" class="soc-error" role="alert">{{ state.errors.conversations }}<button @click="loadConversations()">重试</button></div><p v-if="state.busy.conversations && !state.conversations.length" class="soc-loading" role="status">正在加载会话…</p><SocialEmptyState v-if="!conversations.length && !state.busy.conversations && !state.errors.conversations" :title="query ? '没有匹配的会话' : filter === 'unread' ? '暂时没有未读消息' : filter === 'archived' ? '暂时没有归档会话' : '从一个招呼开始'" description="在好友中心选择一位成员开始交流。" /><NuxtLink v-for="c in conversations" :key="c.user.id" :to="`/messages/${c.user.id}`" class="soc-conversation" :class="{ 'is-active': id === c.user.id, 'is-unread': c.unread }" :aria-current="id === c.user.id ? 'page' : undefined"><span class="soc-avatar-button" :data-tone="c.user.id % 5"><AvatarImage :name="c.user.name" :avatar="c.user.avatar" :avatar-url="c.user.avatarUrl" /></span><span class="soc-conversation__text"><strong>{{ state.friends.find(f => f.user.id === c.user.id)?.metadata?.note || c.user.name }}<Pin v-if="c.preferences.pinned" :size="12" /><BellOff v-if="c.preferences.muted" :size="12" /></strong><span>{{ c.lastMessage ? messagePreview(c.lastMessage.content) : '开始交流吧' }}</span></span><span class="soc-conversation__meta"><time v-if="c.lastMessage">{{ formatRelativeTime(c.lastMessage.createdAt) }}</time><span v-if="c.unread" class="soc-badge">{{ c.unread > 99 ? '99+' : c.unread }}</span></span></NuxtLink><button v-if="state.conversationsCursor" class="soc-btn soc-load-more" :disabled="state.busy.conversations" @click="loadConversations(true)">加载更多会话</button></div><NuxtLink to="/friends" class="soc-conversations__footer"><Users :size="17" />我的好友<ArrowUpRight :size="16" /></NuxtLink></aside>
      <section class="soc-chat" :aria-label="member ? `与 ${member.name} 的会话` : '私信工作台'">
        <SocialEmptyState v-if="!id" title="给同频的人，发个消息吧" description="选择左侧会话，或者去好友中心寻找新的交流。"><NuxtLink to="/friends" class="soc-btn soc-btn--primary">前往好友中心<ArrowUpRight :size="16" /></NuxtLink></SocialEmptyState>
        <SocialEmptyState v-else-if="id === user?.id" title="无法给自己发送私信" description="选择一位好友开始交流。" />
        <template v-else>
          <header class="soc-chat-header"><NuxtLink to="/messages" class="soc-icon soc-mobile-back" aria-label="返回会话列表"><ArrowLeft :size="20" /></NuxtLink><button class="soc-avatar-button" :data-tone="id % 5" aria-label="打开成员资料" @click="showProfile = true"><AvatarImage v-if="member" :name="member.name" :avatar="member.avatar" :avatar-url="member.avatarUrl" /></button><button class="soc-person__identity" @click="showProfile = true"><strong>{{ member?.name || '正在加载成员…' }}</strong><span>社区成员 #{{ id }}</span></button><button class="soc-icon" aria-label="查看成员资料" :aria-expanded="showProfile" @click="showProfile = !showProfile"><Info :size="19" /></button><div class="soc-chat-menu" @keydown.esc.stop="showMenu = false"><button class="soc-icon" aria-label="管理当前会话" :aria-expanded="showMenu" @click="showMenu = !showMenu"><MoreHorizontal :size="21" /></button><div v-if="showMenu" class="soc-popover"><template v-if="api.capabilities.conversations"><button :disabled="state.busy[`conversation:${id}`]" @click="preference('pinned')"><Pin :size="16" />{{ conversation?.preferences.pinned ? '取消置顶' : '置顶会话' }}</button><button :disabled="state.busy[`conversation:${id}`]" @click="preference('muted')"><BellOff :size="16" />{{ conversation?.preferences.muted ? '恢复通知' : '免打扰' }}</button><button :disabled="state.busy[`conversation:${id}`]" @click="preference('archived')"><Archive :size="16" />{{ conversation?.preferences.archived ? '取消归档' : '归档会话' }}</button></template><p v-else class="soc-note">会话整理暂未开放</p><button v-if="api.capabilities.history" class="soc-danger" @click="showMenu = false; clearConfirmation = true"><Trash2 :size="16" />清除我的会话历史</button></div></div></header>
          <p v-if="state.errors[`profile:${id}`]" class="soc-error" role="alert">{{ state.errors[`profile:${id}`] }}<button @click="loadProfile(id)">重试</button></p><p v-if="state.errors[`conversation:${id}`] || state.errors[`read:${id}`]" class="soc-error" role="alert">{{ state.errors[`conversation:${id}`] || state.errors[`read:${id}`] }}</p>
          <div ref="scroll" class="soc-chat-history" @scroll="onScroll"><button v-if="state.histories[id]?.cursor" class="soc-text-action soc-load-more" :disabled="state.busy[`history:${id}`]" @click="older()">加载更早的消息</button><p v-if="state.busy[`history:${id}`] && !state.histories[id]?.loaded" class="soc-loading" role="status">正在加载消息…</p><div v-if="state.errors[`history:${id}`]" class="soc-error" role="alert">{{ state.errors[`history:${id}`] }}<button @click="loadHistory(id)">重试</button></div><SocialEmptyState v-if="state.histories[id]?.loaded && !messages.length && !outbox.length" title="从这里开始你们的对话" description="一句简单的问候，也可以是新灵感的开端。" />
            <template v-for="(message, index) in messages" :key="message.id"><div v-if="newDay(index)" class="soc-date-divider"><span>{{ today(message.createdAt) }}</span></div><article class="soc-message" :class="{ 'soc-message--mine': message.sender.id === user?.id, 'soc-message--grouped': grouped(index) }"><span class="soc-message__avatar" :data-tone="message.sender.id % 5"><AvatarImage v-if="!grouped(index)" :name="message.sender.name" :avatar="message.sender.avatar" :avatar-url="message.sender.avatarUrl" size="sm" /></span><div class="soc-message__body"><div v-if="!grouped(index)" class="soc-message__author">{{ message.sender.id === user?.id ? '我' : message.sender.name }}<time :datetime="message.createdAt">{{ clock(message.createdAt) }}</time></div><div class="soc-bubble"><template v-if="attachment(message.content)"><button v-if="attachment(message.content)!.kind === 'image'" class="soc-image-button" aria-label="预览图片" @click="preview(attachment(message.content)!.url)"><img :src="attachment(message.content)!.url" :alt="attachment(message.content)!.name" @load="atBottom && scrollToLatest()"></button><a v-else class="soc-file" :href="attachment(message.content)!.url" :download="attachment(message.content)!.name"><File :size="22" /><span>{{ attachment(message.content)!.name }}<small>点击下载文件</small></span></a></template><p v-else>{{ message.content }}</p></div><span v-if="api.capabilities.receipts && message.sender.id === user?.id && index === messages.length - 1" class="soc-message-status">{{ message.isRead ? '已读' : '已发送' }}</span></div></article></template>
            <article v-for="pending in outbox" :key="pending.clientMessageId" class="soc-message soc-message--mine"><div class="soc-message__body"><div class="soc-bubble"><p>{{ messagePreview(pending.content) }}</p></div><span v-if="pending.status === 'sending'" class="soc-message-status" role="status">发送中…</span><button v-else class="soc-retry" @click="send(id, pending.content, pending.clientMessageId)">{{ pending.error }} 点击重试</button></div></article>
          </div>
          <button v-if="newMessages" class="soc-new-messages" @click="scrollToLatest()">{{ newMessages }} 条新消息<ChevronDown :size="16" /></button>
          <div class="soc-composer"><p v-if="!canSend && member" class="soc-note">{{ member.relationship === 'blocked' ? '已屏蔽此成员，解除屏蔽后才能继续交流。' : '当前关系或对方的隐私设置不允许发送私信。' }}</p><div v-if="attachments.length" class="soc-attachment-drafts"><div v-for="(file, index) in attachments" :key="index"><img v-if="file.image" :src="file.url" alt="待发送图片"><File v-else :size="20" /><span>{{ file.name }}</span><button class="soc-icon" :aria-label="`移除附件 ${file.name}`" @click="removeFile(index)"><X :size="16" /></button></div></div><p v-if="fileError" class="soc-error" role="alert">{{ fileError }}</p><label class="sr-only" for="message-draft">消息内容</label><textarea id="message-draft" ref="input" v-model="draft" :disabled="!canSend" class="soc-draft" rows="2" :placeholder="member ? `给 ${member.name} 发消息…` : '正在读取会话…'" maxlength="10000" @keydown.enter="handleEnter" @paste="onPaste"></textarea><div class="soc-composer__toolbar"><div class="soc-emoji" @keydown.esc.stop="showEmoji = false; input?.focus()"><button class="soc-icon" aria-label="选择表情" :aria-expanded="showEmoji" :disabled="!canSend" @click="showEmoji = !showEmoji"><Smile :size="20" /></button><div v-if="showEmoji" class="soc-emoji-panel"><label class="sr-only" for="emoji-search">搜索表情</label><input id="emoji-search" v-model="emojiQuery" class="soc-input" placeholder="搜索表情…"><div><button v-for="(item, index) in emojis" :key="index" :aria-label="item.name" @click="emoji(item.char)">{{ item.char }}</button></div><p v-if="!emojis.length" class="soc-note">没有匹配的表情</p></div></div><button class="soc-icon" aria-label="添加图片或文件" :disabled="!canSend || readingFiles" @click="fileInput?.click()"><Paperclip :size="20" /></button><input ref="fileInput" type="file" multiple hidden @change="onFile"><small>{{ readingFiles ? '正在读取附件…' : 'Enter 发送 · Shift + Enter 换行' }}</small><button class="soc-btn soc-btn--primary" :disabled="!canSend || readingFiles || (!draft.trim() && !attachments.length)" @click="submit()"><Send :size="17" />发送</button></div></div>
        </template>
      </section>
      <SocialProfileDrawer v-if="showProfile && id" :user-id="id" :known="member" @close="showProfile = false" />
    </div>
    <p v-if="api.mode === 'mock'" class="soc-demo soc-messages-demo">开发演示 · 消息和附件仅保存在本次演示中</p>
    <ConfirmDialog :open="clearConfirmation" title="清除我的会话历史" description="只清除你看到的历史，不影响对方的聊天记录。此操作无法撤销。" :busy="state.busy[`clear:${id}`]" :error="state.errors[`clear:${id}`]" confirm-label="清除历史" @cancel="clearConfirmation = false" @confirm="clearHistory" />
    <dialog ref="imageDialog" class="soc-image-dialog" aria-label="图片预览" @click="($event.target === imageDialog) && imageDialog?.close()"><button class="soc-icon" aria-label="关闭图片预览" @click="imageDialog?.close()"><X :size="22" /></button><img v-if="imagePreview" :src="imagePreview" alt="聊天图片预览"></dialog>
  </div>
</template>
