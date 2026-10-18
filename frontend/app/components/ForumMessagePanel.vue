<script setup lang="ts">
import { MessageSquare, Users } from '@lucide/vue'
const { state, unread, refresh, loadConversations } = useSocialWorkspace()
const route = useRoute()
onMounted(() => { if (!state.value.initialized) void refresh(); void loadConversations() })
</script>
<template>
  <nav v-if="!route.path.startsWith('/messages') && route.path !== '/friends'" class="soc-shortcuts" aria-label="社交快捷入口">
    <NuxtLink to="/friends" class="soc-icon" aria-label="打开好友中心"><Users :size="20" /><span v-if="state.summary?.incoming || state.incoming.length" class="soc-badge">{{ state.summary?.incoming ?? state.incoming.length }}</span></NuxtLink>
    <NuxtLink to="/messages" class="soc-icon" aria-label="打开私信"><MessageSquare :size="20" /><span v-if="unread" class="soc-badge">{{ unread > 99 ? '99+' : unread }}</span></NuxtLink>
  </nav>
</template>
