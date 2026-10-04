<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="container hero__content">
        <ScrollReveal>
          <p class="hero__badge" data-transition-group="title">Now in Beta</p>
        </ScrollReveal>
        <ScrollReveal>
          <h1 class="hero__title" data-transition-group="title">
            Enjoy Life With<br><span>DevBit Tech</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal>
          <p class="hero__subtitle" data-transition-group="content">
            独乐乐不如众乐乐
          </p>
        </ScrollReveal>
        <ScrollReveal>
          <div class="hero__actions" data-transition-group="content">
            <NuxtLink to="/about" class="btn btn--primary">了解更多</NuxtLink>
            <a href="https://github.com/Clearders/devbit-tech" target="_blank" rel="noopener" class="btn btn--outline">
              github仓库
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>

    <!-- Quick Navigation -->
    <section class="section quick-nav-section">
      <div class="container">
        <ScrollReveal>
          <h2 class="section__title" data-transition-group="title">探索 DevBit Tech</h2>
        </ScrollReveal>
        <ScrollReveal>
          <p class="section__subtitle" data-transition-group="content">从一个问题、一次实验，到下一位同行者。</p>
        </ScrollReveal>
        <div class="quick-nav-grid">
          <ScrollReveal v-for="nav in quickNavItems" :key="nav.to" stretch class="quick-nav-slot" :class="`quick-nav-slot--${nav.kind}`" data-transition-group="card">
            <NuxtLink
              :to="nav.to"
              class="quick-nav-card"
              :class="[`quick-nav-card--${nav.kind}`, { 'is-pressed': pressedQuickNav === nav.kind }]"
              @pointerdown="onCardPress($event, nav.kind)" @pointerup="pressedQuickNav = null"
              @pointercancel="pressedQuickNav = null" @pointerleave="pressedQuickNav = null">
              <div class="quick-nav-card__top"><span>{{ nav.eyebrow }}</span><span class="quick-nav-card__number" aria-hidden="true">{{ nav.number }}</span></div>
              <div class="quick-nav-card__art" aria-hidden="true">
                <QuickNavIcon :kind="nav.kind" />
              </div>
              <div class="quick-nav-card__copy">
                <h3 class="quick-nav-card__title">{{ nav.title }}</h3>
                <p class="quick-nav-card__desc">{{ nav.description }}</p>
              </div>
              <div class="quick-nav-card__bottom"><span>{{ nav.action }}</span><span class="quick-nav-card__arrow" aria-hidden="true">↗</span></div>
            </NuxtLink>
          </ScrollReveal>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
const pressedQuickNav = ref<string | null>(null)
function onCardPress(event: PointerEvent, kind: string) {
  if (event.pointerType !== 'mouse') pressedQuickNav.value = kind
}

const quickNavItems = [
  {
    kind: 'forum', number: '01', eyebrow: '交流 · CONNECT', action: '加入讨论',
    title: '论坛',
    description: '把卡住你的问题，变成大家一起向前的一小步。分享经验，也发现新的思路。',
    to: '/forum'
  },
  {
    kind: 'games', number: '02', eyebrow: '探索 · PLAY', action: '开始探索',
    title: '游戏',
    description: '让代码走出编辑器，在光影与交互中，找回动手创造的乐趣。',
    to: '/games'
  },
  {
    kind: 'leaderboard', number: '03', eyebrow: '成长 · GROW', action: '了解进展',
    title: '排行榜',
    description: '让每一点投入被看见。社区与竞技排名，正在准备中。',
    to: '/leaderboard'
  },
  {
    kind: 'team', number: '04', eyebrow: '同行 · TOGETHER', action: '认识我们',
    title: '团队介绍',
    description: '从一 bit 灵感开始，和一群喜欢创造的人，把想法慢慢做成现实。',
    to: '/about'
  }
] as const


useSeoMeta({
  title: 'DevBit Tech - 首页',
  description: 'DevBit Tech 社区首页：快速进入论坛、游戏、排行榜与团队介绍。'
})
</script>

<style scoped>
.quick-nav-section { background: linear-gradient(180deg, transparent, var(--color-primary-o03), transparent); }
.quick-nav-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; }
.quick-nav-slot { display: grid; grid-column: span 7; min-width: 0; transform-origin: 50% 80%; }
.quick-nav-slot--games { grid-column: span 5; }
.quick-nav-slot--leaderboard { grid-column: span 4; }
.quick-nav-slot--team { grid-column: span 8; }
.quick-nav-card {
  --quick-nav-active: 0;
  --quick-nav-duration: 320ms;
  --quick-nav-icon-fill: #edf3fe;
  --quick-nav-icon-front: #fff;
  position: relative; isolation: isolate; display: flex; flex-direction: column; min-width: 0; min-height: 310px; padding: 28px; overflow: hidden;
  border: 1px solid var(--color-border-light); border-radius: 28px; background: var(--color-surface); box-shadow: var(--shadow-sm); color: var(--color-text);
  transform: translateY(calc(var(--quick-nav-active) * -4px));
  transition: transform var(--quick-nav-duration) var(--ease-out-quint), box-shadow var(--quick-nav-duration) var(--ease-out-quint), border-color var(--quick-nav-duration) var(--ease-out-quint);
}
.quick-nav-card:is(:focus-visible, :active, .is-pressed) {
  --quick-nav-active: 1;
  --quick-nav-duration: 420ms;
  --quick-nav-icon-fill: #dce9fd;
  --quick-nav-icon-front: #f4f8ff;
  box-shadow: var(--shadow-md); border-color: var(--color-border-focus); color: var(--color-text);
}
@media (hover: hover) and (pointer: fine) {
  .quick-nav-card:hover {
    --quick-nav-active: 1;
    --quick-nav-duration: 420ms;
    --quick-nav-icon-fill: #dce9fd;
    --quick-nav-icon-front: #f4f8ff;
    box-shadow: var(--shadow-md); border-color: var(--color-border-focus); color: var(--color-text);
  }
}
.quick-nav-card:is(:active, .is-pressed) { transform: translateY(-1px); }
.quick-nav-card:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 4px; }
.quick-nav-card__top, .quick-nav-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quick-nav-card__top { font-size: .72rem; font-weight: 600; letter-spacing: .1em; color: var(--color-text-secondary); }
.quick-nav-card__number { font: .75rem var(--font-mono); color: var(--color-text-muted); }
.quick-nav-card__copy { margin-top: auto; padding-top: 70px; max-width: 72%; z-index: 1; }
.quick-nav-card__title { font-size: 1.6rem; margin-bottom: 10px; letter-spacing: -.03em; }
.quick-nav-card__desc { font-size: .9rem; line-height: 1.8; color: var(--color-text-secondary); }
.quick-nav-card__bottom { margin-top: 24px; font-size: .8rem; font-weight: 600; color: var(--color-primary-dark); }
.quick-nav-card__arrow { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--color-border-focus); border-radius: 50%; background: rgba(255,255,255,.7); font-size: 1.15rem; transform: translate(calc(var(--quick-nav-active) * 2px), calc(var(--quick-nav-active) * -2px)) rotate(calc(var(--quick-nav-active) * 45deg)); transition: transform var(--quick-nav-duration) var(--ease-out-quint); }
.quick-nav-card__art { position: absolute; right: 30px; top: 62px; width: 120px; height: 120px; z-index: -1; pointer-events: none; }
.quick-nav-card--forum { border-radius: 32px 32px 64px 32px; background: linear-gradient(125deg, #fff 45%, #f0f5ff); }
.quick-nav-card--games { border-radius: 64px 28px 28px 28px; background: linear-gradient(145deg, #fff, #f5f2fc); }
.quick-nav-card--leaderboard { min-height: 240px; border-radius: 28px 28px 28px 52px; background: linear-gradient(140deg, #fff, #faf7f0); }
.quick-nav-card--leaderboard .quick-nav-card__art { width: 76px; height: 76px; top: 60px; right: 24px; }
.quick-nav-card--leaderboard .quick-nav-card__copy { padding-top: 42px; max-width: 78%; }
.quick-nav-card--team { min-height: 240px; border-radius: 28px 64px 28px 28px; }
.quick-nav-card--team .quick-nav-card__art { top: 70px; right: 48px; width: 100px; height: 100px; }
.quick-nav-card--team .quick-nav-card__copy { padding-top: 35px; max-width: 65%; }
@media (max-width: 760px) {
  .quick-nav-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .quick-nav-slot { grid-column: span 1; }
  .quick-nav-slot--forum, .quick-nav-slot--team { grid-column: 1 / -1; }
  .quick-nav-card { min-height: 290px; padding: 22px; border-radius: 24px; }
  .quick-nav-card--forum, .quick-nav-card--team { min-height: 245px; }
  .quick-nav-card--forum { border-bottom-right-radius: 52px; }
  .quick-nav-card--games { border-top-left-radius: 44px; }
  .quick-nav-card__art { width: 70px; height: 70px; right: 24px; top: 52px; }
  .quick-nav-card__copy, .quick-nav-card--leaderboard .quick-nav-card__copy { max-width: 100%; padding-top: 90px; }
  .quick-nav-card--forum .quick-nav-card__copy, .quick-nav-card--team .quick-nav-card__copy { max-width: 70%; padding-top: 40px; }
  .quick-nav-card__title { font-size: 1.3rem; }
  .quick-nav-card__number { display: none; }
  .quick-nav-card--team .quick-nav-card__art { right: 28px; width: 75px; height: 75px; }
}
@media (max-width: 480px) {
  .quick-nav-slot { grid-column: 1 / -1; }
  .quick-nav-card { min-height: 235px; }
  .quick-nav-card__copy, .quick-nav-card--leaderboard .quick-nav-card__copy, .quick-nav-card--team .quick-nav-card__copy { max-width: 75%; padding-top: 45px; }
  .quick-nav-card__art, .quick-nav-card--leaderboard .quick-nav-card__art { width: 60px; height: 60px; right: 24px; top: 58px; }
  .quick-nav-card--team .quick-nav-card__art { width: 60px; height: 60px; right: 30px; top: 60px; }
}
@media (prefers-reduced-motion: reduce) {
  .quick-nav-card, .quick-nav-card__arrow { transition: none; transform: none; }
  .quick-nav-card:is(:active, .is-pressed) { transform: none; }
}
</style>
