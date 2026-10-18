<script setup lang="ts">
import { Users } from '@lucide/vue'
defineProps<{ title: string; description?: string }>()
</script>
<template><div class="soc-empty"><span class="soc-empty__icon"><Users :size="28" aria-hidden="true" /></span><h3>{{ title }}</h3><p v-if="description">{{ description }}</p><slot /></div></template>
