<template>
  <Teleport to="body">
    <!-- Floating message window -->
    <div
      v-if="isAuthenticated && isWindowOpen"
      ref="windowRef"
      class="msg-window"
      :class="{
        'msg-window--dragging': isDragging,
        'msg-window--resizing': isResizing,
        'msg-window--minimized': windowState.isMinimized,
      }"
      :style="windowStyle"
    >
      <!-- Title bar -->
      <div
        class="msg-window__titlebar"
        @pointerdown="onDragPointerDown"
        @dblclick="toggleMinimize"
      >
        <div class="msg-window__titlebar-left">
          <span class="msg-window__title-icon">💬</span>
          <span class="msg-window__title-text">{{ windowTitle }}</span>
          <span v-if="unreadCount > 0" class="msg-window__title-badge">{{ unreadCount }}</span>
        </div>
        <div class="msg-window__titlebar-actions">
          <!-- Dock menu -->
          <div class="msg-window__dock-menu" @pointerdown.stop>
            <button class="msg-window__titlebar-btn" title="停靠位置" @click="showDockMenu = !showDockMenu">
              📌
            </button>
            <div v-if="showDockMenu" class="msg-window__dock-dropdown">
              <button
                v-for="zone in dockZones"
                :key="zone.position"
                class="msg-window__dock-item"
                :class="{ 'msg-window__dock-item--active': windowState.mode === 'docked' && windowState.dock === zone.position }"
                @click="dockTo(zone.position); showDockMenu = false"
              >
                <span>{{ zone.icon }}</span>
                <span>{{ zone.label }}</span>
              </button>
              <button
                class="msg-window__dock-item"
                :class="{ 'msg-window__dock-item--active': windowState.mode === 'centered' }"
                @click="centerWindow(); showDockMenu = false"
              >
                <span>🎯</span>
                <span>居中</span>
              </button>
            </div>
          </div>
          <button class="msg-window__titlebar-btn" title="最小化" @click.stop="toggleMinimize">
            {{ windowState.isMinimized ? '□' : '─' }}
          </button>
          <button class="msg-window__titlebar-btn msg-window__titlebar-btn--close" title="关闭" @click.stop="closeWindow">
            ✕
          </button>
        </div>
      </div>

      <!-- Body (hidden when minimized) -->
      <div v-show="!windowState.isMinimized" class="msg-window__body">
        <!-- Tab navigation -->
        <div class="msg-window__tabs">
          <button
            class="msg-window__tab"
            :class="{ 'msg-window__tab--active': messagePanelTab === 'messages' }"
            @click="messagePanelTab = 'messages'"
          >
            💬 私信
          </button>
          <button
            class="msg-window__tab"
            :class="{ 'msg-window__tab--active': messagePanelTab === 'friends' }"
            @click="messagePanelTab = 'friends'"
          >
            👥 好友
          </button>
          <button
            class="msg-window__tab"
            :class="{ 'msg-window__tab--active': messagePanelTab === 'addFriend' }"
            @click="messagePanelTab = 'addFriend'"
          >
            ➕ 添加
          </button>
        </div>

        <div v-if="actionError" class="form-error form-error--global">{{ actionError }}</div>

        <!-- Messages tab -->
        <template v-if="messagePanelTab === 'messages'">
          <!-- Conversation list -->
          <div v-if="!activeMessagePartner" class="msg-window__conversations">
            <div v-if="conversations.length === 0" class="msg-window__empty">
              <div class="msg-window__empty-icon">📭</div>
              <p>暂无消息</p>
            </div>
            <div
              v-for="conv in conversations"
              :key="conv.partner.id"
              class="msg-window__conv"
              :class="{ 'msg-window__conv--unread': conv.unread > 0 }"
              @click="openConversation(conv.partner.id)"
            >
              <span class="msg-window__conv-avatar">
                <AvatarImage
                  :avatar-url="conv.partner.avatarUrl"
                  :avatar="conv.partner.avatar"
                  :name="conv.partner.name"
                  size="sm"
                />
              </span>
              <div class="msg-window__conv-info">
                <div class="msg-window__conv-name">
                  {{ conv.partner.name }}
                  <span v-if="conv.unread > 0" class="msg-window__conv-unread">{{ conv.unread }}</span>
                </div>
                <div class="msg-window__conv-preview">{{ stripAttachments(conv.lastMessage?.content ?? '') }}</div>
              </div>
              <span class="msg-window__conv-time">{{ conv.lastMessage ? formatRelativeTime(conv.lastMessage.createdAt) : '' }}</span>
            </div>
          </div>

          <!-- Chat view -->
          <div v-else class="msg-window__chat">
            <div class="msg-window__chat-header">
              <button class="msg-window__back" @click="activeMessagePartner = null">← 返回</button>
              <span class="msg-window__chat-partner">{{ activePartnerName }}</span>
              <button class="msg-window__chat-action" title="清除聊天记录" @click="clearChatWithPartner(activeMessagePartner)">
                🗑️
              </button>
            </div>
            <div class="msg-window__chat-messages" ref="chatMessagesRef">
              <div
                v-for="msg in activeMessages"
                :key="msg.id"
                class="msg-window__msg"
                :class="{ 'msg-window__msg--mine': msg.sender.id === currentUserId }"
              >
                <!-- Attachment: image -->
                <template v-if="isImageContent(msg.content)">
                  <div class="msg-window__msg-image" @click="previewImage(msg.content)">
                    <img :src="extractImageSrc(msg.content)" alt="shared image" loading="lazy" />
                  </div>
                </template>
                <!-- Attachment: file -->
                <template v-else-if="isFileContent(msg.content)">
                  <a
                    class="msg-window__msg-file"
                    :href="extractFileSrc(msg.content)"
                    :download="extractFileName(msg.content)"
                    target="_blank"
                  >
                    <span class="msg-window__msg-file-icon">📎</span>
                    <span class="msg-window__msg-file-name">{{ extractFileName(msg.content) }}</span>
                    <span class="msg-window__msg-file-dl">⬇</span>
                  </a>
                </template>
                <!-- Text -->
                <template v-else>
                  <div class="msg-window__msg-content">
                    <MarkdownRenderer :content="msg.content" inline />
                  </div>
                </template>
                <div class="msg-window__msg-time">{{ formatRelativeTime(msg.createdAt) }}</div>
              </div>
              <div v-if="activeMessages.length === 0" class="msg-window__empty">
                <div class="msg-window__empty-icon">💬</div>
                <p>暂无消息，发送第一条消息吧！</p>
              </div>
            </div>

            <!-- Attachments preview -->
            <div v-if="pendingAttachments.length > 0" class="msg-window__attachments-preview">
              <div v-for="(att, idx) in pendingAttachments" :key="idx" class="msg-window__attachment-item">
                <img v-if="att.type === 'image'" :src="att.dataUrl" alt="preview" class="msg-window__attachment-thumb" />
                <span v-else class="msg-window__attachment-file-icon">📄</span>
                <span class="msg-window__attachment-name">{{ att.name }}</span>
                <button class="msg-window__attachment-remove" @click="removeAttachment(idx)">✕</button>
              </div>
            </div>

            <!-- Input area -->
            <div class="msg-window__chat-input">
              <!-- Emoji picker -->
              <div class="msg-window__emoji-picker-wrapper" ref="emojiPickerRef">
                <button
                  class="msg-window__input-btn"
                  title="表情"
                  @click="showEmojiPicker = !showEmojiPicker"
                >
                  😊
                </button>
                <div v-if="showEmojiPicker" class="msg-window__emoji-picker" @pointerdown.stop>
                  <div class="msg-window__emoji-search">
                    <input
                      v-model="emojiSearch"
                      type="text"
                      class="form-control"
                      placeholder="搜索表情…"
                    />
                  </div>
                  <div class="msg-window__emoji-categories">
                    <button
                      v-for="cat in emojiCategories"
                      :key="cat.label"
                      class="msg-window__emoji-cat-btn"
                      :class="{ 'msg-window__emoji-cat-btn--active': activeEmojiCategory === cat.label }"
                      :title="cat.label"
                      @click="activeEmojiCategory = cat.label"
                    >
                      {{ cat.icon }}
                    </button>
                  </div>
                  <div class="msg-window__emoji-grid">
                    <button
                      v-for="emoji in displayedEmojis"
                      :key="emoji.char"
                      class="msg-window__emoji-item"
                      :title="emoji.name"
                      @click="insertEmoji(emoji.char)"
                    >
                      {{ emoji.char }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- File upload -->
              <button
                class="msg-window__input-btn"
                title="发送图片/文件"
                @click="triggerFileInput"
              >
                🖼️
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z,.tar,.gz"
                multiple
                hidden
                @change="onFileSelected"
              />

              <!-- Text input -->
              <textarea
                ref="messageInputRef"
                v-model="newMessage"
                class="form-control msg-window__textarea"
                placeholder="输入消息… (支持粘贴图片)"
                rows="1"
                @keydown.enter.exact="handleSend"
                @keydown.enter.shift.exact="newMessage += '\n'"
                @paste="onPaste"
                @input="autoResizeTextarea"
              ></textarea>

              <button
                class="btn btn--primary msg-window__send-btn"
                @click="handleSend"
                :disabled="sending || (!newMessage.trim() && pendingAttachments.length === 0)"
              >
                {{ sending ? '发送中...' : '发送' }}
              </button>
            </div>
          </div>
        </template>

        <!-- Friends tab -->
        <template v-if="messagePanelTab === 'friends'">
          <div class="msg-window__conversations">
            <div v-if="friendsList.length === 0" class="msg-window__empty">
              <div class="msg-window__empty-icon">👥</div>
              <p>暂无好友，去「添加」标签页搜索并添加好友吧</p>
            </div>
            <div
              v-for="friend in friendsList"
              :key="friend.user.id"
              class="msg-window__conv"
              @click="openConversationFromFriend(friend.user.id)"
            >
              <span class="msg-window__conv-avatar">
                <AvatarImage
                  :avatar-url="friend.user.avatarUrl"
                  :avatar="friend.user.avatar"
                  :name="friend.user.name"
                  size="sm"
                />
              </span>
              <div class="msg-window__conv-info">
                <div class="msg-window__conv-name">{{ friend.user.name }}</div>
              </div>
              <button
                class="msg-window__friend-remove"
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
          <div class="msg-window__add-friend">
            <div class="msg-window__search-row">
              <input
                v-model="friendSearchQuery"
                type="text"
                class="form-control"
                placeholder="搜索用户名…"
                @keydown.enter="handleSearchUsers"
              />
              <button
                class="btn btn--primary"
                @click="handleSearchUsers"
                :disabled="searchingUsers || !friendSearchQuery.trim()"
              >
                {{ searchingUsers ? '搜索中...' : '搜索' }}
              </button>
            </div>
            <div v-if="searchResults.length > 0" class="msg-window__conversations">
              <div
                v-for="resultUser in searchResults"
                :key="resultUser.id"
                class="msg-window__conv"
              >
                <span class="msg-window__conv-avatar">
                  <AvatarImage
                    :avatar-url="resultUser.avatarUrl"
                    :avatar="resultUser.avatar"
                    :name="resultUser.name"
                    size="sm"
                  />
                </span>
                <div class="msg-window__conv-info">
                  <div class="msg-window__conv-name">{{ resultUser.name }}</div>
                </div>
                <button
                  v-if="!isFriend(resultUser.id) && resultUser.id !== currentUserId"
                  class="btn btn--primary msg-window__add-btn"
                  @click="handleAddFriend(resultUser.id)"
                  :disabled="addingFriendId === resultUser.id"
                >
                  {{ addingFriendId === resultUser.id ? '添加中...' : '添加' }}
                </button>
                <span v-else-if="resultUser.id === currentUserId" class="msg-window__self-tag">自己</span>
                <span v-else class="msg-window__already-friend">已添加</span>
              </div>
            </div>
            <div v-else-if="friendSearchQuery && !searchingUsers" class="msg-window__empty">
              <p>未找到匹配的用户</p>
            </div>
          </div>
        </template>
      </div>

      <!-- Resize handles -->
      <template v-if="!windowState.isMinimized">
        <div class="msg-window__resize msg-window__resize--n" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'n')"></div>
        <div class="msg-window__resize msg-window__resize--s" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 's')"></div>
        <div class="msg-window__resize msg-window__resize--e" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'e')"></div>
        <div class="msg-window__resize msg-window__resize--w" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'w')"></div>
        <div class="msg-window__resize msg-window__resize--ne" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'ne')"></div>
        <div class="msg-window__resize msg-window__resize--nw" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'nw')"></div>
        <div class="msg-window__resize msg-window__resize--se" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'se')"></div>
        <div class="msg-window__resize msg-window__resize--sw" @pointerdown.prevent="(e: PointerEvent) => onResizePointerDown(e, 'sw')"></div>
      </template>

      <!-- Image preview overlay -->
      <Teleport to="body">
        <div v-if="previewImageUrl" class="msg-window__image-overlay" @click="previewImageUrl = null">
          <img :src="previewImageUrl" alt="preview" class="msg-window__image-preview" @click.stop />
          <button class="msg-window__image-close" @click="previewImageUrl = null">✕</button>
        </div>
      </Teleport>
    </div>

    <!-- Floating toggle button (visible when window is closed) -->
    <button
      v-if="isAuthenticated && !isWindowOpen"
      ref="toggleBtnRef"
      class="msg-window__toggle"
      :class="{ 'msg-window__toggle--dragging': isToggleDragging }"
      :style="toggleStyle"
      title="打开私信"
      @pointerdown.prevent="onTogglePointerDown"
      @click="onToggleClick"
    >
      <span class="msg-window__toggle-icon">💬</span>
      <span v-if="unreadCount > 0" class="msg-window__badge">{{ unreadCount }}</span>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import type { ForumMessage, ForumUser } from '~/composables/useForum'
import AvatarImage from '~/components/AvatarImage.vue'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { useMessageWindow } from '~/composables/useMessageWindow'
import { EMOJI_CATEGORIES, searchEmoji } from '~/utils/emojiData'

const { user, isAuthenticated } = useAuth()
const {
  formatRelativeTime,
  getConversations,
  getUnreadMessageCount,
  sendMessage,
  messages,
  isMessagePanelOpen,
  activeMessagePartner,
  messagePanelTab,
  openMessagePanel,
  getFriends,
  isFriend,
  addFriend,
  removeFriend,
  searchUsers,
} = useForum()

const {
  windowState,
  isWindowOpen,
  isDragging,
  isResizing,
  openWindow,
  closeWindow,
  toggleMinimize,
  dockTo,
  onDragPointerDown,
  onResizePointerDown,
  dockZones,
} = useMessageWindow()

// ---------- Refs ----------
const newMessage = ref('')
const chatMessagesRef = ref<HTMLElement | null>(null)
const messageInputRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const emojiPickerRef = ref<HTMLElement | null>(null)
const toggleBtnRef = ref<HTMLElement | null>(null)
const windowRef = ref<HTMLElement | null>(null)
const sending = ref(false)
const actionError = ref('')

// Emoji state
const showEmojiPicker = ref(false)
const emojiSearch = ref('')
const activeEmojiCategory = ref(EMOJI_CATEGORIES[0]?.label ?? '表情')
const showDockMenu = ref(false)

// Image preview
const previewImageUrl = ref<string | null>(null)

// Pending attachments
interface PendingAttachment {
  type: 'image' | 'file'
  name: string
  dataUrl: string
  base64: string
  mimeType: string
}
const pendingAttachments = ref<PendingAttachment[]>([])

// Toggle drag state
const togglePos = ref({ x: 0, y: 0 })
const isToggleDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 0, posY: 0 })
const hasMoved = ref(false)
const DRAG_THRESHOLD = 4
const TOGGLE_DEFAULT_RIGHT = 24
const TOGGLE_DEFAULT_BOTTOM = 24

// Friend search state
const friendSearchQuery = ref('')
const searchResults = ref<ForumUser[]>([])
const searchingUsers = ref(false)
const addingFriendId = ref<number | null>(null)

// ---------- Computed ----------
const conversations = computed(() => getConversations())
const unreadCount = computed(() => getUnreadMessageCount())
const friendsList = computed(() => getFriends())
const currentUserId = computed(() => user.value?.id ?? 0)

const windowTitle = computed(() => {
  if (activeMessagePartner.value && messagePanelTab.value === 'messages') {
    return `💬 ${activePartnerName.value}`
  }
  switch (messagePanelTab.value) {
    case 'friends': return '👥 好友列表'
    case 'addFriend': return '➕ 添加好友'
    default: return '💬 私信'
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

const emojiCategories = EMOJI_CATEGORIES

const displayedEmojis = computed(() => {
  if (emojiSearch.value.trim()) {
    return searchEmoji(emojiSearch.value)
  }
  const cat = EMOJI_CATEGORIES.find(c => c.label === activeEmojiCategory.value)
  return cat?.emojis ?? []
})

// ---------- Window style ----------
const windowStyle = computed(() => {
  const state = windowState.value
  return {
    left: `${state.x}px`,
    top: `${state.y}px`,
    width: `${state.width}px`,
    height: state.isMinimized ? 'auto' : `${state.height}px`,
  }
})

// ---------- Toggle button style ----------
const toggleStyle = computed(() => {
  const x = togglePos.value.x
  const y = togglePos.value.y
  if (x === 0 && y === 0) return {} as Record<string, string>
  return {
    position: 'fixed',
    right: 'auto',
    bottom: 'auto',
    left: `${x}px`,
    top: `${y}px`,
  } as Record<string, string>
})

// ---------- Sync with useForum's open state ----------
watch(isMessagePanelOpen, (open) => {
  if (open && !isWindowOpen.value) {
    openWindow()
  }
})

watch(activeMessagePartner, (partnerId) => {
  if (partnerId && messagePanelTab.value !== 'messages') {
    messagePanelTab.value = 'messages'
  }
})

watch(isWindowOpen, (open) => {
  if (!open) {
    isMessagePanelOpen.value = false
    activeMessagePartner.value = null
  }
})

// Click outside to close menus
function onDocumentClick(e: MouseEvent) {
  if (showDockMenu.value) {
    showDockMenu.value = false
  }
  if (showEmojiPicker.value) {
    const el = emojiPickerRef.value
    if (el && !el.contains(e.target as Node)) {
      showEmojiPicker.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('pointermove', onTogglePointerMove)
  document.removeEventListener('pointerup', onTogglePointerUp)
})

// ---------- Toggle button dragging ----------
function onTogglePointerDown(e: PointerEvent) {
  hasMoved.value = false
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const posX = togglePos.value.x || (window.innerWidth - TOGGLE_DEFAULT_RIGHT - rect.width)
  const posY = togglePos.value.y || (window.innerHeight - TOGGLE_DEFAULT_BOTTOM - rect.height)
  dragStart.value = { x: e.clientX, y: e.clientY, posX, posY }
  document.addEventListener('pointermove', onTogglePointerMove)
  document.addEventListener('pointerup', onTogglePointerUp)
}

function onTogglePointerMove(e: PointerEvent) {
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  if (!hasMoved.value && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    hasMoved.value = true
    isToggleDragging.value = true
  }
  if (!hasMoved.value) return
  const btnWidth = toggleBtnRef.value?.offsetWidth ?? 52
  const btnHeight = toggleBtnRef.value?.offsetHeight ?? 52
  let newX = dragStart.value.posX + dx
  let newY = dragStart.value.posY + dy
  newX = Math.max(0, Math.min(newX, window.innerWidth - btnWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - btnHeight))
  togglePos.value = { x: newX, y: newY }
}

function onTogglePointerUp() {
  document.removeEventListener('pointermove', onTogglePointerMove)
  document.removeEventListener('pointerup', onTogglePointerUp)
  setTimeout(() => { isToggleDragging.value = false }, 50)
}

function onToggleClick() {
  if (hasMoved.value) return
  openWindow()
}

// ---------- Window helpers ----------
function centerWindow() {
  if (!import.meta.client) return
  windowState.value = {
    ...windowState.value,
    x: Math.max(0, (window.innerWidth - windowState.value.width) / 2),
    y: Math.max(0, (window.innerHeight - windowState.value.height) / 2),
    mode: 'centered',
  }
}

// ---------- Strip attachments for preview ----------
function stripAttachments(text: string): string {
  return text.replace(/!\[.*?\]\(data:image\/.*?\)/g, '[图片]').replace(/\[.*?\]\(data:(?!image\/).*?\)/g, '[文件]')
}

// ---------- Conversation logic ----------
function openConversation(partnerId: number) {
  messagePanelTab.value = 'messages'
  openMessagePanel(partnerId)
  nextTick(() => scrollToBottom())
}

function openConversationFromFriend(partnerId: number) {
  messagePanelTab.value = 'messages'
  openMessagePanel(partnerId)
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

function clearChatWithPartner(partnerId: number | null) {
  if (!partnerId) return
  messages.value = messages.value.filter(
    m => !((m.sender.id === currentUserId.value && m.recipient.id === partnerId) ||
           (m.sender.id === partnerId && m.recipient.id === currentUserId.value))
  )
}

// ---------- Attachment helpers ----------
function isImageContent(content: string): boolean {
  return /^!\[.*?\]\(data:image\//.test(content.trim())
}

function isFileContent(content: string): boolean {
  return /^\[.*?\]\(data:(?!image\/)/.test(content.trim())
}

function extractImageSrc(content: string): string {
  const match = content.match(/\(([^)]+)\)/)
  return match?.[1] ?? ''
}

function extractFileSrc(content: string): string {
  const match = content.match(/\(([^)]+)\)/)
  return match?.[1] ?? ''
}

function extractFileName(content: string): string {
  const match = content.match(/^\[([^\]]+)\]/)
  return match?.[1] ?? 'file'
}

function previewImage(content: string) {
  previewImageUrl.value = extractImageSrc(content)
}

// ---------- File input ----------
function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return
  for (const file of Array.from(files)) {
    const reader = new FileReader()
    const isImage = file.type.startsWith('image/')
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1] ?? ''
      if (base64.length > 13_000_000) {
        actionError.value = '文件过大，最大支持 10MB。'
        return
      }
      pendingAttachments.value.push({
        type: isImage ? 'image' : 'file',
        name: file.name,
        dataUrl,
        base64,
        mimeType: file.type,
      })
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removeAttachment(index: number) {
  pendingAttachments.value.splice(index, 1)
}

// ---------- Paste handler ----------
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1] ?? ''
        if (base64.length > 13_000_000) {
          actionError.value = '图片过大，最大支持 10MB。'
          return
        }
        pendingAttachments.value.push({
          type: 'image',
          name: `pasted-image-${Date.now()}.png`,
          dataUrl,
          base64,
          mimeType: 'image/png',
        })
      }
      reader.readAsDataURL(file)
    }
  }
}

// ---------- Emoji ----------
function insertEmoji(char: string) {
  newMessage.value += char
  showEmojiPicker.value = false
  nextTick(() => {
    messageInputRef.value?.focus()
  })
}

// ---------- Send ----------
async function handleSend() {
  const text = newMessage.value.trim()
  const hasAttachments = pendingAttachments.value.length > 0
  if ((!text && !hasAttachments) || !activeMessagePartner.value || sending.value) return
  actionError.value = ''
  sending.value = true
  try {
    let fullContent = text
    for (const att of pendingAttachments.value) {
      if (att.type === 'image') {
        fullContent += `\n![${att.name}](${att.dataUrl})`
      } else {
        fullContent += `\n[${att.name}](${att.dataUrl})`
      }
    }
    if (!fullContent.trim()) {
      fullContent = pendingAttachments.value.map(a => a.type === 'image' ? '📷 图片' : `📎 ${a.name}`).join(', ')
      if (pendingAttachments.value.length === 1 && pendingAttachments.value[0]!.type === 'image') {
        const att = pendingAttachments.value[0]!
        fullContent = `![${att.name}](${att.dataUrl})`
      }
    }
    await sendMessage(activeMessagePartner.value, fullContent.trim())
    newMessage.value = ''
    pendingAttachments.value = []
    await nextTick()
    scrollToBottom()
    if (messageInputRef.value) {
      (messageInputRef.value as HTMLTextAreaElement).style.height = 'auto'
    }
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '发送消息失败，请稍后重试。')
  } finally {
    sending.value = false
  }
}

// ---------- Auto-resize textarea ----------
function autoResizeTextarea() {
  const el = messageInputRef.value as HTMLTextAreaElement | null
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
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

// ---------- Watchers ----------
watch(activeMessages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

// Viewport resize handling
if (import.meta.client) {
  window.addEventListener('resize', () => {
    if (togglePos.value.x === 0 && togglePos.value.y === 0) return
    const btnWidth = toggleBtnRef.value?.offsetWidth ?? 52
    const btnHeight = toggleBtnRef.value?.offsetHeight ?? 52
    togglePos.value = {
      x: Math.min(togglePos.value.x, window.innerWidth - btnWidth),
      y: Math.min(togglePos.value.y, window.innerHeight - btnHeight),
    }
  })
}
</script>
