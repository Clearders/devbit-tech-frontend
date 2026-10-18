<script setup lang="ts">
import { X, MessageSquare, Star, UserPlus, Shield, UserMinus, ArrowUpRight } from '@lucide/vue'
import type { ForumUser } from '~~/shared/forum'
const props = defineProps<{ userId: number; known?: ForumUser }>()
const emit = defineEmits<{ close: [] }>()
const { state, api, loadProfile, run } = useSocialWorkspace()
const panel = ref<HTMLElement>(), modal = ref(false), note = ref(''), groupId = ref(''), greeting = ref(''), confirmation = ref<'remove' | 'block' | null>(null)
let previous: HTMLElement | null = null, media: MediaQueryList | undefined
let savedNote = '', savedGroup = ''
const profile = computed(() => state.value.profiles[props.userId] ?? state.value.members[props.userId])
const details = computed(() => state.value.profiles[props.userId])
const friend = computed(() => ['friends', 'contact'].includes(profile.value?.relationship ?? '') ? state.value.friendRecords[props.userId] : undefined)
const key = computed(() => `member:${props.userId}`)
watch(() => props.userId, async () => { greeting.value = ''; confirmation.value = null; await loadProfile(props.userId, props.known) }, { immediate: true })
watch(() => friend.value?.metadata, value => {
  const nextNote = value?.note ?? '', nextGroup = value?.groupId == null ? '' : String(value.groupId)
  if (note.value === savedNote) note.value = nextNote
  if (groupId.value === savedGroup) groupId.value = nextGroup
  savedNote = nextNote; savedGroup = nextGroup
}, { immediate: true, deep: true })
async function action(fn: (s: ReturnType<typeof useSocialApi>) => Promise<unknown>, notice: string) {
  const confirmed = confirmation.value
  if (await run(key.value, fn, notice)) {
    if (confirmed && profile.value) {
      const updated = { ...profile.value, relationship: confirmed === 'block' ? 'blocked' as const : 'none' as const, canMessage: confirmed === 'remove' && api.value.mode === 'legacy' }
      state.value.members[props.userId] = updated
      state.value.profiles[props.userId] = { ...details.value, ...updated }
      if (confirmed === 'remove') delete state.value.friendRecords[props.userId]
    }
    confirmation.value = null; await loadProfile(props.userId, props.known)
  }
}
function keyboard(e: KeyboardEvent) {
  if (confirmation.value) return
  if (e.key === 'Escape') { e.stopPropagation(); emit('close') }
  if (!modal.value || e.key !== 'Tab') return
  const controls = [...(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea') ?? [])]
  const first = controls[0], last = controls.at(-1)
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
}
function resize() { modal.value = !!media?.matches }
onMounted(() => { previous = document.activeElement as HTMLElement; media = matchMedia('(max-width: 1199px)'); resize(); media.addEventListener('change', resize); panel.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }) })
onBeforeUnmount(() => { media?.removeEventListener('change', resize); if (previous?.isConnected) previous.focus({ preventScroll: true }) })
</script>
<template>
  <div class="soc-profile-shade" aria-hidden="true" @click="emit('close')"></div>
  <aside ref="panel" class="soc-profile" :role="modal ? 'dialog' : 'region'" :aria-modal="modal ? true : undefined" aria-label="成员资料" @keydown="keyboard">
    <div class="soc-profile__bar"><span>成员资料</span><button class="soc-icon" aria-label="关闭成员资料" @click="emit('close')"><X :size="19" /></button></div>
    <div v-if="state.busy[`profile:${userId}`]" class="soc-loading" role="status">正在读取资料…</div>
    <div v-if="state.errors[`profile:${userId}`]" class="soc-error" role="alert">{{ state.errors[`profile:${userId}`] }}<button @click="loadProfile(userId, known)">重试</button></div>
    <template v-if="profile">
      <div class="soc-profile__identity"><AvatarImage :name="profile.name" :avatar="profile.avatar" :avatar-url="profile.avatarUrl" size="lg" /><h2>{{ friend?.metadata?.note || profile.name }}</h2><p v-if="friend?.metadata?.note">{{ profile.name }}</p><small>社区成员 · #{{ profile.id }}</small><span v-if="profile.relationship === 'friends' || profile.relationship === 'contact'" class="soc-label">{{ profile.relationship === 'contact' ? '单向联系人' : '已是好友' }}</span></div>
      <div class="soc-profile__content">
        <p v-if="details?.bio" class="soc-bio">{{ details.bio }}</p>
        <div v-if="details?.interests?.length" class="soc-tags"><span v-for="tag in details.interests" :key="tag">{{ tag }}</span></div>
        <NuxtLink v-if="profile.canMessage" class="soc-btn soc-btn--primary soc-wide" :to="`/messages/${userId}`"><MessageSquare :size="17" />发消息</NuxtLink>
        <p v-else-if="profile.relationship !== 'self'" class="soc-note">当前关系或对方的隐私设置不允许发送私信。</p>
        <div v-if="profile.relationship === 'none'" class="soc-profile__section"><h3>{{ api.mode === 'legacy' ? '添加联系人' : '认识一下' }}</h3><label v-if="api.capabilities.requests" :for="`greeting-${userId}`">申请留言</label><textarea v-if="api.capabilities.requests" :id="`greeting-${userId}`" v-model="greeting" class="soc-input" maxlength="200" rows="3" placeholder="聊聊你们共同感兴趣的话题…"></textarea><button class="soc-btn soc-wide" :disabled="state.busy[key]" @click="action(s => s.requestFriend(userId, greeting), api.mode === 'legacy' ? '已添加联系人' : '好友申请已发送')"><UserPlus :size="17" />{{ api.mode === 'legacy' ? '添加联系人' : '发送好友申请' }}</button></div>
        <div v-if="profile.relationship === 'incoming_pending' && profile.requestId" class="soc-profile__section"><p class="soc-note">这位成员已经向你发送了好友申请。</p><button class="soc-btn soc-btn--primary soc-wide" :disabled="state.busy[key]" @click="action(s => s.acceptRequest(profile!.requestId!), '已成为好友')">接受申请</button></div>
        <div v-if="profile.relationship === 'outgoing_pending' && profile.requestId" class="soc-profile__section"><p class="soc-note">申请已发送，等待对方确认。</p><button class="soc-btn soc-wide" :disabled="state.busy[key]" @click="action(s => s.cancelRequest(profile!.requestId!), '已撤回申请')">撤回申请</button></div>
        <form v-if="friend" class="soc-profile__section soc-form" @submit.prevent="action(s => s.updateFriend(userId, { note: note.trim(), groupId: groupId ? Number(groupId) : null }), '私人备注与分组已保存')">
          <h3>好友管理</h3><template v-if="api.capabilities.metadata"><label for="friend-note">私人备注 <small>仅自己可见</small></label><input id="friend-note" v-model="note" class="soc-input" maxlength="60" placeholder="怎么称呼这位好友？"><template v-if="api.capabilities.groups"><label for="friend-group">所在分组</label><select id="friend-group" v-model="groupId" class="soc-input"><option value="">未分组</option><option v-for="group in state.groups" :key="group.id" :value="String(group.id)">{{ group.name }}</option></select></template><button class="soc-btn" :disabled="state.busy[key]">保存</button><button type="button" class="soc-text-action" :disabled="state.busy[key]" @click="action(s => s.updateFriend(userId, { starred: !friend?.metadata?.starred }), friend?.metadata?.starred ? '已取消星标' : '已添加星标')"><Star :size="16" :fill="friend.metadata?.starred ? 'currentColor' : 'none'" />{{ friend.metadata?.starred ? '取消星标' : '设为星标好友' }}</button></template><p v-else class="soc-note">备注与分组功能暂未开放。</p>
          <button type="button" class="soc-text-action soc-danger" @click="confirmation = 'remove'"><UserMinus :size="16" />{{ api.mode === 'legacy' ? '移除联系人' : '移除好友' }}</button>
        </form>
        <div v-if="details?.recentPosts?.length" class="soc-profile__section"><h3>近期公开帖子</h3><NuxtLink v-for="post in details.recentPosts" :key="post.id" class="soc-post-link" :to="`/forum/${post.id}`">{{ post.title }}<ArrowUpRight :size="15" /></NuxtLink></div>
        <button v-if="api.capabilities.blocks && profile.relationship !== 'self'" class="soc-text-action soc-danger" :disabled="state.busy[key]" @click="profile.relationship === 'blocked' ? action(s => s.unblock(userId), '已解除屏蔽') : confirmation = 'block'"><Shield :size="16" />{{ profile.relationship === 'blocked' ? '解除屏蔽' : '屏蔽此成员' }}</button>
        <p v-if="state.errors[key] && !confirmation" class="soc-error" role="alert">{{ state.errors[key] }}</p>
        <p v-if="state.errors[`metadata:${userId}`]" class="soc-error" role="alert">{{ state.errors[`metadata:${userId}`] }}<button @click="loadProfile(userId, known)">重新读取好友备注</button></p>
      </div>
    </template>
  </aside>
  <ConfirmDialog :open="!!confirmation" :title="confirmation === 'block' ? '屏蔽成员' : '移除好友'" :description="confirmation === 'block' ? '屏蔽后将无法互发私信；已有聊天记录保留。' : '移除后保留已有聊天记录，重新建立好友关系需要发送申请。'" :busy="state.busy[key]" :error="state.errors[key]" :confirm-label="confirmation === 'block' ? '确认屏蔽' : '确认移除'" @cancel="confirmation = null" @confirm="confirmation === 'block' ? action(s => s.block(userId), '已屏蔽成员') : action(s => s.removeFriend(userId), '已移除')" />
</template>
