<script setup lang="ts">
// Keep one keyed instance for conversation switches while allowing page-entry transitions.
definePageMeta({
  middleware: 'auth',
  key: 'messages-workspace',
  scrollToTop: false,
  validate: route => route.params.userId === undefined || route.params.userId === ''
    || (/^\d+$/.test(String(route.params.userId)) && Number.isSafeInteger(Number(route.params.userId)) && Number(route.params.userId) > 0),
})
useSeoMeta({ title: '私信 – DevBit Tech', robots: 'noindex, nofollow' })
const route = useRoute()
const partnerId = computed(() => route.params.userId ? Number(route.params.userId) : undefined)
</script>
<template><SocialMessagesWorkspace :user-id="partnerId" /></template>
