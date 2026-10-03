<template>
  <div>
    <div class="page-header">
      <div class="container" data-transition-group="title">
        <h1 class="page-header__title">或许</h1>
        <p class="page-header__subtitle about-subtitle--large">
          将谓偷闲学少年
        </p>
        <p class="page-header__subtitle about-subtitle--large">但</p>
        <p class="page-header__subtitle about-subtitle--Bold">谁又不曾是少年</p>
      </div>
    </div>

    <section class="about-section">
      <div class="container">
        <h2 class="section__title" data-transition-group="title">我们的目标</h2>
        <p data-transition-group="content">我们相信：网站应该让人感到快乐</p>
        <p data-transition-group="content">快乐不能构筑现实，但现实是为了更快乐的生活</p>
        <p data-transition-group="content">
          We believe that websites should make people happy.Happiness cannot
          construct reality, but reality is for a happier life
        </p>

        <h2 class="section__title" style="margin-top: 3rem" data-transition-group="title">我们的团队</h2>
        <div class="team-grid">
          <div v-for="member in team" :key="member.name" class="team-card" data-transition-group="card">
            <div class="team-card__avatar">{{ member.avatar }}</div>
            <div class="team-card__name">{{ member.name }}</div>
            <div class="team-card__role">{{ member.role }}</div>
          </div>
        </div>
        <section class="detail-panel" aria-labelledby="project-about-title" data-transition-group="card">
          <h2 id="project-about-title">我们正在创造什么</h2>
          <div class="info-grid">
            <article>
              <h3>交流社区</h3>
              <p>
                用论坛记录技术问题、开发过程与作品灵感，让一个人的经验成为大家的参考。
              </p>
              <NuxtLink to="/forum">浏览讨论 →</NuxtLink>
            </article>
            <article>
              <h3>浏览器里的实验</h3>
              <p>从 Bevy 光影演示出发，探索代码、图形与交互带来的乐趣。</p>
              <NuxtLink to="/games">了解游戏实验 →</NuxtLink>
            </article>
          </div>
        </section>
        <section class="detail-panel" aria-labelledby="contribute-title" data-transition-group="card">
          <h2 id="contribute-title">从一个小贡献开始</h2>
          <ol class="guide-steps">
            <li>阅读仓库 README，了解项目结构与启动方式。</li>
            <li>
              先查看已有问题和讨论，选择文档修正、体验反馈或边界清楚的小改动。
            </li>
            <li>分享改动的原因和验证方式；界面改动可以附上前后截图。</li>
          </ol>
          <div class="page-tools" data-transition-group="content">
            <a
              href="https://github.com/Clearders/devbit-tech"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--primary"
              >查看 GitHub 仓库 ↗</a
            ><NuxtLink to="/forum/new" class="btn btn--outline"
              >分享建议</NuxtLink
            >
          </div>
        </section>
        <section class="detail-panel" aria-labelledby="about-faq-title" data-transition-group="card">
          <h2 id="about-faq-title">常见问题</h2>
          <details class="info-disclosure">
            <summary>刚开始学习编程，也可以参与吗？</summary>
            <p>
              可以。一个描述清楚的问题、一段学习记录或一处文档修正，都是参与的起点。
            </p>
          </details>
          <details class="info-disclosure">
            <summary>怎样反馈问题更有帮助？</summary>
            <p>
              说明预期与实际行为，附上复现步骤、浏览器版本和错误信息。发布截图或日志前，请移除个人信息与密钥。
            </p>
          </details>
          <details class="info-disclosure">
            <summary>网站的功能都已开放了吗？</summary>
            <p>
              社区仍处于 Beta
              阶段。可以体验论坛与现有游戏；排行榜正在开发中，尚未开放排名。
            </p>
          </details>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const team = [
  { avatar: '👨‍💻', name: 'Clearders', role: '全栈前端工程师' },
  { avatar: '🧑‍🎨', name: 'EpsilonHunter', role: '全栈后端工程师' },
]

useSeoMeta({
  title: '团队介绍 – DevBit Tech',
  description: '认识 DevBit Tech 团队，了解社区、游戏实验与开源参与方式。',
})
</script>

<style scoped>
.about-subtitle--large {
  font-size: 1.35rem;
}
.about-subtitle--Bold {
  font-size: 1.55rem;
  font-weight: bold;
}
</style>
