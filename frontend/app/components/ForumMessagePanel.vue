<template>
  <div v-if="isAuthenticated" class="message-panel" :class="{ 'message-panel--open': isOpen }">
    <button class="message-panel__toggle" @click="toggle" :title="isOpen ? '关闭消息' : '打开消息'">
      <span class="message-panel__toggle-icon">💬</span>
      <span v-if="unreadCount > 0" class="message-panel__badge">{{ unreadCount }}</span>
    </button>

    <div v-if="isOpen" class="message-panel__body">
      <div class="message-panel__header">
        <h3>私信</h3>
        <button class="message-panel__close" @click="isOpen = false">✕</button>
      </div>
      <div v-if="actionError" class="form-error form-error--global">{{ actionError }}</div>

      <!-- Conversation list -->
      <div v-if="!activePartner" class="message-panel__conversations">
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
          <button class="message-panel__back" @click="activePartner = null">← 返回</button>
          <span class="message-panel__chat-partner">{{ activePartnerName }}</span>
        </div>
        <div class="message-panel__chat-messages" ref="chatMessagesRef">
          <div
            v-for="msg in activeMessages"
            :key="msg.id"
            class="message-panel__msg"
            :class="{ 'message-panel__msg--mine': msg.sender.id === currentUserId }"
          >
            <div class="message-panel__msg-content">{{ msg.content }}</div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForumMessage } from '~/composables/useForum'
import { useForum } from '~/composables/useForum'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

const { user, isAuthenticated } = useAuth()
const {
  formatRelativeTime,
  getConversations,
  getUnreadMessageCount,
  sendMessage,
  markConversationAsRead,
  messages
} = useForum()

const isOpen = ref(false)
const activePartner = ref<number | null>(null)
const newMessage = ref('')
const chatMessagesRef = ref<HTMLElement | null>(null)
const sending = ref(false)
const actionError = ref('')

const conversations = computed(() => getConversations())
const unreadCount = computed(() => getUnreadMessageCount())

const currentUserId = computed(() => user.value?.id ?? 0)

const activePartnerName = computed(() => {
  const conv = conversations.value.find(c => c.partner.id === activePartner.value)
  return conv?.partner.name ?? ''
})

const activeMessages = computed(() => {
  if (!activePartner.value) return [] as ForumMessage[]
  return messages.value
    .filter(m =>
      (m.sender.id === currentUserId.value && m.recipient.id === activePartner.value) ||
      (m.sender.id === activePartner.value && m.recipient.id === currentUserId.value)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

function toggle() {
  isOpen.value = !isOpen.value
  activePartner.value = null
}

function openConversation(partnerId: number) {
  activePartner.value = partnerId
  markConversationAsRead(partnerId).catch((error: unknown) => {
    actionError.value = extractApiErrorMessage(error, '标记已读失败，请稍后重试。')
  })
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
  if (!text || !activePartner.value || sending.value) return
  actionError.value = ''
  sending.value = true
  try {
    await sendMessage(activePartner.value, text)
    newMessage.value = ''
    await nextTick()
    scrollToBottom()
  } catch (error: unknown) {
    actionError.value = extractApiErrorMessage(error, '发送消息失败，请稍后重试。')
  } finally {
    sending.value = false
  }
}

watch(activeMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })
</script>
