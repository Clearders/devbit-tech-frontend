<template>
  <div class="inner-page">
    <InnerPageHeader title="排行榜" description="社区贡献与竞技排名功能正在筹备中。" :icon="Trophy"  />
    <section class="about-section">
      <div class="container">
        <ScrollReveal>
          <div class="detail-panel" data-transition-group="card">
            <h2 class="leaderboard-state"><Construction :size="28" :stroke-width="1.75" aria-hidden="true" />这里还在建设中</h2>
            <p>
              排行榜尚未开放。计分规则和上线时间确定后再作说明。
            </p>
            <div class="page-tools" data-transition-group="content">
              <NuxtLink to="/forum" class="btn btn--primary"
                ><MessageSquare :size="18" :stroke-width="1.75" aria-hidden="true" />参与社区讨论</NuxtLink
              ><NuxtLink to="/games" class="btn btn--outline"><Gamepad2 :size="18" :stroke-width="1.75" aria-hidden="true" />探索游戏</NuxtLink>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Trophy, Construction, MessageSquare, Gamepad2 } from '@lucide/vue'
useSeoMeta({
  title: 'DevBit Tech – 排行榜',
  description: 'DevBit Tech 排行榜正在开发中，欢迎先参与社区讨论与游戏体验。',
})
</script>

<style scoped>
.leaderboard-state { display: flex; align-items: center; gap: 12px; }
.leaderboard-state svg { color: var(--color-primary-dark); flex-shrink: 0; }
</style>
