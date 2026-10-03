<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="container hero__content">
        <p class="hero__badge" data-transition-group="title">Now in Beta</p>
        <h1 class="hero__title" data-transition-group="title">
          Enjoy Life With<br><span>DevBit Tech</span>
        </h1>
        <p class="hero__subtitle" data-transition-group="content">
          独乐乐不如众乐乐
        </p>
        <div class="hero__actions" data-transition-group="content">
          <NuxtLink to="/about" class="btn btn--primary">了解更多</NuxtLink>
          <a href="https://github.com/Clearders/devbit-tech" target="_blank" rel="noopener" class="btn btn--outline">
            github仓库
          </a>
        </div>
      </div>
    </section>

    <!-- Quick Navigation -->
    <section class="section quick-nav-section">
      <div class="container">
        <h2 class="section__title" data-transition-group="title">探索 DevBit Tech</h2>
        <p class="section__subtitle" data-transition-group="content">快速跳转到你感兴趣的板块</p>
        <div class="quick-nav-grid">
          <NuxtLink
            v-for="nav in quickNavItems"
            :key="nav.to"
            :to="nav.to"
            class="quick-nav-card"
           data-transition-group="card">
            <div class="quick-nav-card__icon">{{ nav.icon }}</div>
            <h3 class="quick-nav-card__title">{{ nav.title }}</h3>
            <p class="quick-nav-card__desc">{{ nav.description }}</p>
            <span class="quick-nav-card__arrow">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
const quickNavItems = [
  {
    icon: '💬',
    title: '论坛',
    description: '参与技术讨论，分享经验，提问解答。',
    to: '/forum'
  },
  {
    icon: '🎮',
    title: '游戏',
    description: '探索我们精心开发的小游戏。',
    to: '/games'
  },
  {
    icon: '🏆',
    title: '排行榜',
    description: '查看社区贡献者与竞技活动排名。',
    to: '/leaderboard'
  },
  {
    icon: '👥',
    title: '团队介绍',
    description: '了解 DevBit Tech 背后的核心团队。',
    to: '/about'
  }
]


useSeoMeta({
  title: 'DevBit Tech - 首页',
  description: 'DevBit Tech 社区首页：快速进入论坛、游戏、排行榜与团队介绍。'
})
</script>
