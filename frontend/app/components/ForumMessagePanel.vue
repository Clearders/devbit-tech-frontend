<template>
  <div v-if="isAuthenticated" class="message-panel" :class="{ 'message-panel--open': isMessagePanelOpen }">
    <!-- Draggable toggle button -->
    <button
      ref="toggleBtnRef"
      class="message-panel__toggle"
      :class="{ 'message-panel__toggle--dragging': isDragging }"
      :style="toggleStyle"
      :title="isMessagePanelOpen ? '关闭消息' : '打开消息'"
      @pointerdown.prevent="onTogglePointerDown"
      @click="onToggleClick"
    >
      <span class="message-panel__toggle-icon">💬</span>
      <span v-if="unreadCount > 0" class="message-panel__badge">{{ unreadCount }}</span>
    </button>

    <div v-if="isMessagePanelOpen" class="message-panel__body">
      <div class="message-panel__header">
        <h3>{{ panelTitle }}</h3>
        <button class="message-panel__close" @click="isMessagePanelOpen = false">✕</button>
      </div>

      <!-- Tab navigation -->
      <div class="message-panel__tabs">
        <button
          class="message-panel__tab"
          :class="{ 'message-panel__tab--active': messagePanelTab === 'messages' }"
          @click="messagePanelTab = 'messages'"
        >
          💬 私信
        </button>
        <button
          class="message-panel__tab"
          :class="{ 'message-panel__tab--active': messagePanelTab === 'friends' }"
          @click="messagePanelTab = 'friends'"
        >
          👥 好友
        </button>
        <button
          class="message-panel__tab"
          :class="{ 'message-panel__tab--active': messagePanelTab === 'addFriend' }"
          @click="messagePanelTab = 'addFriend'"
        >
          ➕ 添加
        </button>
      </div>

      <div v-if="actionError" class="form-error form-error--global">{{ actionError }}</div>

      <!-- Messages tab -->
      <template v-if="messagePanelTab === 'messages'">
        <div v-if="!activeMessagePartner" class="message-panel__conversations">
          <div v-if="conversations.length === 0" class="message-panel__empty">
            暂无消息
          </div>
          <div
            v-for="conv in conversations"
            :key="conv.partner.id"
            class="message-panel__conv"
            :class="{ 'message-panel__conv--unread': conv.unread > 0 }"
            @click="openConversation(conv.partner.id)"
          >
            <span class="message-panel__conv-avatar">{{ conv.partner.avatar }}</span>
            <div class="message-panel__conv-info">
              <div class="message-panel__conv-name">
                {{ conv.partner.name }}
                <span v-if="conv.unread > 0" class="message-panel__conv-unread">{{ conv.unread }}</span>
              </div>
              <div class="message-panel__conv-preview">{{ conv.lastMessage?.content ?? '' }}</div>
            </div>
            <span class="message-panel__conv-time">{{ conv.lastMessage ? formatRelativeTime(conv.lastMessage.createdAt) : '' }}</span>
          </div>
        </div>

        <!-- Chat view -->
        <div v-else class="message-panel__chat">
          <div class="message-panel__chat-header">
            <button class="message-panel__back" @click="activeMessagePartner = null">← 返回</button>
            <span class="message-panel__chat-partner">{{ activePartnerName }}</span>
          </div>
          <div class="message-panel__chat-messages" ref="chatMessagesRef">
            <div
              v-for="msg in activeMessages"
              :key="msg.id"
              class="message-panel__msg"
              :class="{ 'message-panel__msg--mine': msg.sender.id === currentUserId }"
            >
              <div class="message-panel__msg-content">
                <MarkdownRenderer :content="msg.content" inline />
              </div>
              <div class="message-panel__msg-time">{{ formatRelativeTime(msg.createdAt) }}</div>
            </div>
            <div v-if="activeMessages.length === 0" class="message-panel__empty">暂无消息</div>
          </div>
          <div class="message-panel__chat-input">
            <input
              v-model="newMessage"
              type="text"
              class="form-control"
              placeholder="输入消息…"
              @keydown.enter="handleSend"
            />
            <button class="btn btn--primary" @click="handleSend" :disabled="sending || !newMessage.trim()">
              {{ sending ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </template>

      <!-- Friends tab -->
      <template v-if="messagePanelTab === 'friends'">
        <div class="message-panel__conversations">
          <div v-if="friendsList.length === 0" class="message-panel__empty">
            暂无好友，去「添加」标签页搜索并添加好友吧
          </div>
          <div
            v-for="friend in friendsList"
            :key="friend.user.id"
            class="message-panel__conv"
            @click="openConversationFromFriend(friend.user.id)"
          >
            <span class="message-panel__conv-avatar">{{ friend.user.avatar }}</span>
            <div class="message-panel__conv-info">
              <div class="message-panel__conv-name">{{ friend.user.name }}</div>
            </div>
            <button
              class="message-panel__friend-remove"
              title="删除好友"
              @click.stop="handleRemoveFriend(friend.user.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </template>

      <!-- Add Friend tab -->
      <template v-if="messagePanelTab === 'addFriend'">
        <div class="message-panel__add-friend">
          <div class="message-panel__search-row">
            <input
              v-model="friendSearchQuery"
              type="text"
              class="form-control"
              placeholder="搜索用户名…"
              @keydown.enter="handleSearchUsers"
            />
            <button class="btn btn--primary" @click="handleSearchUsers" :disabled="searchingUsers || !friendSearchQuery.trim()">
              {{ searchingUsers ? '搜索中...' : '搜索' }}
            </button>
          </div>
          <div v-if="searchResults.length > 0" class="message-panel__conversations">
            <div
              v-for="resultUser in searchResults"
              :key="resultUser.id"
              class="message-panel__conv"
            >
              <span class="message-panel__conv-avatar">{{ resultUser.avatar }}</span>
              <div class="message-panel__conv-info">
                <div class="message-panel__conv-name">{{ resultUser.name }}</div>
              </div>
              <button
                v-if="!isFriend(resultUser.id) && resultUser.id !== currentUserId"
                class="btn btn--primary message-panel__add-btn"
                @click="handleAddFriend(resultUser.id)"
                :disabled="addingFriendId === resultUser.id"
              >
                {{ addingFriendId === resultUser.id ? '添加中...' : '添加' }}
              </button>
              <span v-else-if="resultUser.id === currentUserId" class="message-panel__self-tag">
                自己
              </span>
              <span v-else class="message-panel__already-friend">
                已添加
              </span>
            </div>
          </div>
          <div v-else-if="friendSearchQuery && !searchingUsers" class="message-panel__empty">
            未找到匹配的用户
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumMessage, FriendInfo, ForumUser } from '~/composables/useForum'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

const { user, isAuthenticated } = useAuth()
const {
  formatRelativeTime,
  getConversations,
  getUnreadMessageCount,
  sendMessage,
  markConversationAsRead,
  messages,
  isMessagePanelOpen,
  activeMessagePartner,
  messagePanelTab,
  openMessagePanel,
  friends,
  getFriends,
  isFriend,
  addFriend,
  removeFriend,
  searchUsers
} = useForum()

const newMessage = ref('')
const chatMessagesRef = ref<HTMLElement | null>(null)
const toggleBtnRef = ref<HTMLElement | null>(null)
const sending = ref(false)
const actionError = ref('')

// Friend search state
const friendSearchQuery = ref('')
const searchResults = ref<ForumUser[]>([])
const searchingUsers = ref(false)
const addingFriendId = ref<number | null>(null)

// Draggable toggle state
const togglePos = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 0, posY: 0 })
const hasMoved = ref(false)
const DRAG_THRESHOLD = 4
const TOGGLE_DEFAULT_RIGHT = 24 // px from right
const TOGGLE_DEFAULT_BOTTOM = 24 // px from bottom

const conversations = computed(() => getConversations())
const unreadCount = computed(() => getUnreadMessageCount())
const friendsList = computed(() => getFriends())

const currentUserId = computed(() => user.value?.id ?? 0)

const panelTitle = computed(() => {
  switch (messagePanelTab.value) {
    case 'friends': return '好友列表'
    case 'addFriend': return '添加好友'
    default: return '私信'
  }
})

const activePartnerName = computed(() => {
  const conv = conversations.value.find(c => c.partner.id === activeMessagePartner.value)
  return conv?.partner.name ?? ''
})

const activeMessages = computed(() => {
  if (!activeMessagePartner.value) return [] as ForumMessage[]
  return messages.value
    .filter(m =>
      (m.sender.id === currentUserId.value && m.recipient.id === activeMessagePartner.value) ||
      (m.sender.id === activeMessagePartner.value && m.recipient.id === currentUserId.value)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

// Toggle button style based on drag position
const toggleStyle = computed(() => {
  const x = togglePos.value.x
  const y = togglePos.value.y
  if (x === 0 && y === 0) return {} as Record<string, string>
  return {
    position: 'fixed',
    right: 'auto',
    bottom: 'auto',
    left: `${x}px`,
    top: `${y}px`
  } as Record<string, string>
})

// ---------- Dragging logic ----------

function onTogglePointerDown(e: PointerEvent) {
  hasMoved.value = false
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const posX = togglePos.value.x || (window.innerWidth - TOGGLE_DEFAULT_RIGHT - rect.width)
  const posY = togglePos.value.y || (window.innerHeight - TOGGLE_DEFAULT_BOTTOM - rect.height)

  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    posX,
    posY
  }

  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y

  if (!hasMoved.value && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    hasMoved.value = true
    isDragging.value = true
  }

  if (!hasMoved.value) return

  const btnWidth = toggleBtnRef.value?.offsetWidth ?? 52
  const btnHeight = toggleBtnRef.value?.offsetHeight ?? 52

  let newX = dragStart.value.posX + dx
  let newY = dragStart.value.posY + dy

  // Clamp to viewport
  newX = Math.max(0, Math.min(newX, window.innerWidth - btnWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - btnHeight))

  togglePos.value = { x: newX, y: newY }
}

function onPointerUp() {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  setTimeout(() => {
    isDragging.value = false
  }, 50)
}

function onToggleClick() {
  if (hasMoved.value) return // was a drag, not a click
  toggle()
}

// Reset position on window resize
if (import.meta.client) {
  window.addEventListener('resize', () => {
    if (togglePos.value.x === 0 && togglePos.value.y === 0) return
    const btnWidth = toggleBtnRef.value?.offsetWidth ?? 52
    const btnHeight = toggleBtnRef.value?.offsetHeight ?? 52
    togglePos.value = {
      x: Math.min(togglePos.value.x, window.innerWidth - btnWidth),
      y: Math.min(togglePos.value.y, window.innerHeight - btnHeight)
    }
  })
}

// ---------- Panel logic ----------

function toggle() {
  if (isMessagePanelOpen.value) {
    isMessagePanelOpen.value = false
    activeMessagePartner.value = null
  } else {
    isMessagePanelOpen.value = true
  }
}

function openConversation(partnerId: number) {
  messagePanelTab.value = 'messages'
  openMessagePanel(partnerId)
  nextTick(() => {
    scrollToBottom()
  })
}

function openConversationFromFriend(partnerId: number) {
  messagePanelTab.value = 'messages'
  openMessagePanel(partnerId)
  nextTick(() => {
    scrollToBottom()
  })
}

function scrollToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

async function handleSend() {
  const text = newMessage.value.trim()
  if (!text || !activeMessagePartner.value || sending.value) return
  actionError.value = ''
  sending.value = true
  try {
    await sendMessage(activeMessagePartner.value, text)
    newMessage.value = ''
    await nextTick()
    scrollToBottom()
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '发送消息失败，请稍后重试。')
  } finally {
    sending.value = false
  }
}

// ---------- Friend logic ----------

async function handleSearchUsers() {
  const q = friendSearchQuery.value.trim()
  if (!q) return
  searchingUsers.value = true
  try {
    searchResults.value = await searchUsers(q)
  } catch {
    actionError.value = '搜索用户失败，请稍后重试。'
    searchResults.value = []
  } finally {
    searchingUsers.value = false
  }
}

async function handleAddFriend(friendId: number) {
  addingFriendId.value = friendId
  actionError.value = ''
  try {
    await addFriend(friendId)
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '添加好友失败，请稍后重试。')
  } finally {
    addingFriendId.value = null
  }
}

async function handleRemoveFriend(friendId: number) {
  actionError.value = ''
  try {
    await removeFriend(friendId)
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '删除好友失败，请稍后重试。')
  }
}

watch(activeMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
})
</script>
