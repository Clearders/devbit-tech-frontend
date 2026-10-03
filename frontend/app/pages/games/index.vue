<template>
  <div>
    <section class="page-header">
      <div class="container" data-transition-group="title">
        <h1 class="page-header__title">🎮 游戏</h1>
        <p class="page-header__subtitle">
          探索我们开发的小游戏，寓教于乐，提升技能。
        </p>
      </div>
    </section>

    <section class="games-section">
      <div class="container">
        <div class="games-grid">
          <!-- Heartstring Blade -->
          <article class="game-card" data-transition-group="card">
            <div class="game-card__cover">
              <div class="game-card__cover-placeholder">
                <span class="game-card__cover-emoji">✨</span>
              </div>
            </div>
            <div class="game-card__body">
              <h3 class="game-card__title">Heartstring Blade</h3>
              <p class="game-card__desc">
                基于 Bevy 引擎的 2D bloom
                后期特效演示。交互式调整泛光强度、色调映射等参数，感受现代游戏渲染管线的魅力。
              </p>
              <div class="game-card__tags">
                <span class="game-card__tag">Bevy</span>
                <span class="game-card__tag">WASM</span>
                <span class="game-card__tag">图形学</span>
                <span class="game-card__tag">Bloom</span>
              </div>
            </div>
            <div class="page-tools game-card__actions" data-transition-group="content">
              <NuxtLink
                to="/games/heartstring-blade"
                no-prefetch
                class="btn btn--primary"
                >开始体验</NuxtLink
              ><a href="#game-guide" class="btn btn--outline">查看操作</a>
            </div>
          </article>

          <!-- Future game placeholder -->
          <div class="game-card game-card--coming-soon" data-transition-group="card">
            <div class="game-card__cover">
              <div
                class="game-card__cover-placeholder game-card__cover-placeholder--dimmed"
              >
                <span class="game-card__cover-emoji">🚧</span>
              </div>
            </div>
            <div class="game-card__body">
              <h3 class="game-card__title">更多游戏</h3>
              <p class="game-card__desc">敬请期待更多精彩小游戏……</p>
            </div>
          </div>
        </div>
        <section
          id="game-guide"
          class="detail-panel"
          aria-labelledby="game-guide-title"
         data-transition-group="card">
          <h2 id="game-guide-title">Heartstring Blade · 操作指南</h2>
          <p>
            这是一个基于 Bevy 与 WebAssembly 的 2D
            图形实验。通过对比泛光与色调映射，探索光晕、亮度和颜色之间的关系。
          </p>
          <GameControls />
        </section>
        <section class="detail-panel" aria-labelledby="game-faq-title" data-transition-group="card">
          <h2 id="game-faq-title">体验前，你可能想知道</h2>
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
          <NuxtLink to="/forum" class="btn btn--outline">交流实验心得</NuxtLink>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'DevBit Tech – 游戏',
  description: '探索我们精心开发的小游戏。',
})
</script>

<style scoped>
.game-card__actions {
  padding: 0 1.5rem 1.5rem;
  margin-top: auto;
}
.games-section {
  padding: 2rem 0 5rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 1.75rem;
}

/* ============================================
   Game Card
   ============================================ */
.game-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.3s var(--ease-out-quint),
    box-shadow 0.3s var(--ease-in-out),
    border-color 0.3s var(--ease-in-out);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}

.game-card--coming-soon {
  cursor: default;
  opacity: 0.65;
}

.game-card--coming-soon:hover {
  transform: none;
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

/* Cover */
.game-card__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
}

.game-card__cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.game-card__cover-placeholder--dimmed {
  background: linear-gradient(135deg, #e8e6e1, #ddd9d2);
}

.game-card__cover-emoji {
  font-size: 3rem;
  opacity: 0.8;
  transition: transform 0.3s var(--ease-spring);
}

.game-card:hover .game-card__cover-emoji {
  transform: scale(1.15);
}

/* Play overlay */
.game-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.3s var(--ease-in-out);
}

.game-card:hover .game-card__overlay {
  opacity: 1;
}

.game-card__play-text {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1.4rem;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 0.5rem;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition:
    background 0.2s var(--ease-in-out),
    border-color 0.2s var(--ease-in-out);
}

.game-card:hover .game-card__play-text {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.6);
}

/* Body */
.game-card__body {
  padding: 1.25rem 1.35rem 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.game-card__title {
  font-size: 1.1rem;
  font-weight: 700;
  font-family: var(--font-display), sans-serif;
  color: var(--color-text);
  margin-bottom: 0.45rem;
  letter-spacing: -0.01em;
}

.game-card__desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 1rem;
  flex: 1;
}

/* Tags */
.game-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.game-card__tag {
  display: inline-flex;
  padding: 0.2rem 0.6rem;
  border-radius: 0.375rem;
  background: rgba(91, 141, 239, 0.07);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
}
</style>
