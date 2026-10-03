<template>
  <div>
    <section class="page-header">
      <div class="container" data-transition-group="title">
        <p class="hero__badge" data-transition-group="title">Coming Soon</p>
        <h1 class="page-header__title">🏆 排行榜</h1>
        <p class="page-header__subtitle">社区贡献与竞技排名功能正在筹备中。</p>
      </div>
    </section>
    <section class="about-section">
      <div class="container">
        <div class="detail-panel" data-transition-group="card">
          <h2>这里还在建设中</h2>
          <p>
            排行榜尚未开放，目前没有可展示的排名数据。计分规则和上线时间确定后再作说明。
          </p>
          <p>现在也有值得参与的事：分享一个技术问题，或体验一次光影实验。</p>
          <div class="page-tools" data-transition-group="content">
            <NuxtLink to="/forum" class="btn btn--primary"
              >参与社区讨论</NuxtLink
            ><NuxtLink to="/games" class="btn btn--outline">探索游戏</NuxtLink>
          </div>
        </div>
        <NuxtLink
          to="/"
          class="btn btn--primary"
          style="margin-top: 1.5rem; display: inline-flex"
          >← 返回主页</NuxtLink
        >
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'DevBit Tech – 排行榜',
  description: 'DevBit Tech 排行榜正在开发中，欢迎先参与社区讨论与游戏体验。',
})
</script>
