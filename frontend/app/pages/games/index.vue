<template>
  <div class="inner-page games-page">
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <h1 class="page-header__title"><Gamepad2 :size="28" :stroke-width="1.75" aria-hidden="true" />实验</h1>
          <p class="page-header__subtitle">
            让代码走出编辑器，探索光影、颜色与交互。
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
                <img src="/images/heartstring-bloom.png" alt="Heartstring Blade 泛光实验中的发光圆形与六边形" class="game-card__cover-image" width="1440" height="900" loading="lazy">
              </div>
              <div class="game-card__body">
                <p class="game-card__eyebrow">交互图形实验 · 推荐桌面键盘</p><h3 class="game-card__title">Heartstring Blade</h3>
                <p class="game-card__desc">
                  对比泛光与色调映射，观察光晕、亮度和颜色的变化。
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
                  ><Play :size="18" :stroke-width="1.75" aria-hidden="true" />开始实验</NuxtLink
                ><button type="button" class="btn btn--outline" @click="openGuide"><BookOpen :size="18" :stroke-width="1.75" aria-hidden="true" />查看操作</button>
              </div>
            </article>
          </ScrollReveal>

        </div>
        <ScrollReveal>
          <div class="game-coming-soon" data-transition-group="content"><Construction :size="18" :stroke-width="1.75" aria-hidden="true" /><span>更多实验正在准备中</span></div>
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
                首次启动需要下载并初始化游戏资源。查看本页说明不会启动游戏，点击“开始实验”后才会加载。
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
import { Gamepad2, Construction, Play, BookOpen } from '@lucide/vue'
const guideOpen = ref(false)
async function openGuide() {
  guideOpen.value = true
  await nextTick()
  document.getElementById('game-guide')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
}
useSeoMeta({
  title: 'DevBit Tech – 实验',
  description: '探索浏览器里的图形与交互实验。',
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
.game-card__cover { position: relative; aspect-ratio: 16 / 6; overflow: hidden; background: #10101a; }
.game-card__cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
.game-card__eyebrow { color: var(--color-link); font-size: 13px; margin-bottom: 10px; }
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
}
</style>
