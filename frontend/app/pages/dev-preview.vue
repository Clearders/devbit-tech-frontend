<script setup lang="ts">
const config = useRuntimeConfig()
if (!import.meta.dev || config.public.socialMode !== 'mock') throw createError({ statusCode: 404, statusMessage: 'Not found' })
useSeoMeta({ title: '本地社交预览 – DevBit Tech', robots: 'noindex, nofollow' })
const { openMessagePanel, messagePanelTab } = useForum()
function openFriends() { messagePanelTab.value = 'friends'; openMessagePanel() }
</script>
<template><section class="container dev-preview"><p class="hero__badge">仅本地开发 · Mock</p><h1>好友与私信交互预览</h1><p>这里有九位好友、两个分组、一条收到的申请和四段会话。社交操作保存在内存中，刷新后重置；论坛帖子为只读样例。</p><div class="dev-preview__actions"><button class="btn btn--primary" @click="openFriends">打开好友中心</button><NuxtLink class="btn btn--outline" to="/messages/1001">查看私信工作台</NuxtLink><NuxtLink class="btn btn--outline" to="/forgot-password">查看账号恢复</NuxtLink></div><p>可搜索：林间代码、向量与光、小步创作、一页笔记。</p></section></template>
