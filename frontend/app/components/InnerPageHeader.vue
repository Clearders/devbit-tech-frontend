<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowLeft } from '@lucide/vue'

defineProps<{ title: string; description?: string; icon?: Component; backTo?: string; backLabel?: string }>()
</script>

<template>
  <section class="inner-heading">
    <ScrollReveal>
      <div class="container" data-transition-group="title">
        <NuxtLink v-if="backTo" :to="backTo" class="inner-back">
          <ArrowLeft :size="18" :stroke-width="1.75" aria-hidden="true" />{{ backLabel || '返回' }}
        </NuxtLink>
        <div class="inner-heading__row">
          <div class="inner-heading__intro">
            <h1 class="inner-heading__title">
              <component :is="icon" v-if="icon" :size="28" :stroke-width="1.75" aria-hidden="true" />{{ title }}
            </h1>
            <p v-if="description" class="inner-heading__description">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="inner-heading__actions"><slot name="actions" /></div>
        </div>
      </div>
    </ScrollReveal>
  </section>
</template>
