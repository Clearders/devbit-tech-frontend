<template>
  <div class="inner-page games-page">
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <h1 class="page-header__title"><Gamepad2 :size="28" :stroke-width="1.75" aria-hidden="true" />游戏</h1>
          <p class="page-header__subtitle">
            探索我们开发的小游戏，寓教于乐，提升技能。
          </p>
        </div>
      </ScrollReveal>
    </section>

    <section class="games-section">
      <div class="container">
        <div class="games-grid">
          <!-- Heartstring Blade -->
          <ScrollReveal stretch>
            <article class="game-card" data-transition-group="card">
              <div class="game-card__cover">
                <div class="game-card__cover-placeholder">
                  <span class="game-card__cover-geometry"><Sparkles :size="80" :stroke-width="1.75" aria-hidden="true" /></span>
                </div>
              </div>
              <div class="game-card__body">
                <h3 class="game-card__title">Heartstring Blade</h3>
                <p class="game-card__desc">
                  在光影与颜色中探索交互式图形实验。
                </p>
                <InfoDisclosure title="技术介绍">
                  <p>基于 Bevy 引擎的 2D bloom 后期特效演示。交互式调整泛光强度、色调映射等参数，感受现代游戏渲染管线的魅力。</p>
                <div class="game-card__tags">
                  <span class="game-card__tag">Bevy</span>
                  <span class="game-card__tag">WASM</span>
                  <span class="game-card__tag">图形学</span>
                  <span class="game-card__tag">Bloom</span>
                </div>
                </InfoDisclosure>
              </div>
              <div class="page-tools game-card__actions" data-transition-group="content">
                <NuxtLink
                  to="/games/heartstring-blade"
                  no-prefetch
                  class="btn btn--primary"
                  ><Play :size="18" :stroke-width="1.75" aria-hidden="true" />开始体验</NuxtLink
                ><button type="button" class="btn btn--outline" @click="openGuide"><BookOpen :size="18" :stroke-width="1.75" aria-hidden="true" />查看操作</button>
              </div>
            </article>
          </ScrollReveal>

        </div>
        <ScrollReveal>
          <div class="game-coming-soon" data-transition-group="content"><Construction :size="18" :stroke-width="1.75" aria-hidden="true" /><span>更多游戏正在准备中</span></div>
        </ScrollReveal>
        <ScrollReveal>
          <section
            id="game-guide"
            class="detail-panel"
            aria-label="操作指南"
           data-transition-group="card">
<InfoDisclosure v-model="guideOpen" title="Heartstring Blade · 操作指南">
            <p>
              这是一个基于 Bevy 与 WebAssembly 的 2D
              图形实验。通过对比泛光与色调映射，探索光晕、亮度和颜色之间的关系。
            </p>
            <GameControls />
            </InfoDisclosure>
          </section>
        </ScrollReveal>
        <ScrollReveal>
          <section class="detail-panel" aria-label="体验帮助" data-transition-group="card">
            <InfoDisclosure title="体验前，你可能想知道">
            <details class="info-disclosure">
              <summary>为什么首次进入需要等待？</summary>
              <p>
                首次启动需要下载并初始化游戏资源。查看本页说明不会启动游戏，点击“开始体验”后才会加载。
              </p>
            </details>
            <details class="info-disclosure">
              <summary>手机可以操作吗？</summary>
              <p>
                目前参数调整以键盘为主，建议在电脑上体验。手机可以浏览项目与操作说明。
              </p>
            </details>
            <details class="info-disclosure">
              <summary>画面黑屏或加载失败怎么办？</summary>
              <p>
                检查网络连接，使用加载页的重试按钮；如仍失败，尝试支持 WebGL
                的桌面浏览器，并检查硬件加速设置。反馈时可提供浏览器版本及错误提示。
              </p>
            </details>
            </InfoDisclosure>
            <NuxtLink to="/forum" class="btn btn--outline">交流实验心得</NuxtLink>
          </section>
        </ScrollReveal>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Gamepad2, Sparkles, Construction, Play, BookOpen } from '@lucide/vue'
const guideOpen = ref(false)
async function openGuide() {
  guideOpen.value = true
  await nextTick()
  document.getElementById('game-guide')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
}
useSeoMeta({
  title: 'DevBit Tech – 游戏',
  description: '探索我们精心开发的小游戏。',
})
</script>

<style scoped>
.games-page .page-header { padding: 48px 0 24px; }
.games-page .page-header .container { max-width: 900px; }
.page-header__title { display: flex; align-items: center; gap: 12px; }
.page-header__title svg { color: var(--color-primary-dark); }
.games-section { padding: 24px 0 32px; }
.games-section > .container { max-width: 900px; }
.games-grid { display: grid; grid-template-columns: minmax(0, 1fr); }
.game-card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border-light); border-radius: 12px; background: var(--color-surface); box-shadow: var(--shadow-xs); }
.game-card__cover { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); }
.game-card__cover::before, .game-card__cover::after { content: ''; position: absolute; pointer-events: none; border: 1px solid rgb(180 206 250 / .14); }
.game-card__cover::before { width: 42%; aspect-ratio: 1; left: 29%; top: 12%; border-radius: 50%; }
.game-card__cover::after { width: 25%; aspect-ratio: 1; left: 37.5%; top: 28%; transform: rotate(45deg); border-radius: 8px; }
.game-card__cover-placeholder { display: grid; place-items: center; position: absolute; inset: 0; }
.game-card__cover-geometry { display: grid; place-items: center; color: #d9e7ff; }
.game-card__cover-geometry svg { width: 80px; height: 80px; }
.game-card__body { padding: 24px 24px 12px; }
.game-card__title { font: 700 20px/1.4 var(--font-display); margin-bottom: 8px; }
.game-card__desc { color: var(--color-text-secondary); font-size: 14px; margin-bottom: 16px; }
.game-card__tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.game-card__tag { padding: 3px 8px; border-radius: 4px; background: var(--color-primary-o06); color: var(--color-primary-dark); font-size: 12px; }
.game-card__actions { padding: 0 24px 24px; margin: 0; }
.game-coming-soon { display: flex; align-items: center; gap: 10px; padding: 20px 0 0; color: var(--color-text-secondary); font-size: 14px; }
@media (max-width: 767px) {
  .games-page .page-header { padding: 32px 0 16px; }
  .game-card__body { padding: 20px 20px 8px; }
  .game-card__actions { padding: 0 20px 20px; }
  .game-card__cover-geometry svg { width: 64px; height: 64px; }
}
</style>
