<template>
  <svg class="quick-nav-icon" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <circle class="quick-nav-icon__halo" cx="40" cy="40" r="35" />

    <g v-if="kind === 'forum'">
      <g class="quick-nav-icon__forum-back">
        <path class="quick-nav-icon__surface" d="M34 20h24a6 6 0 0 1 6 6v17a6 6 0 0 1-6 6h-3l-7 6v-6H34a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6Z" />
        <path class="quick-nav-icon__detail" d="M38 29h15m-15 7h9" />
      </g>
      <g class="quick-nav-icon__forum-front">
        <path class="quick-nav-icon__surface quick-nav-icon__surface--front" d="M21 32h25a6 6 0 0 1 6 6v15a6 6 0 0 1-6 6H32l-8 6v-6h-3a6 6 0 0 1-6-6V38a6 6 0 0 1 6-6Z" />
        <path class="quick-nav-icon__detail" d="M24 42h18" />
        <g class="quick-nav-icon__dots"><circle cx="25" cy="50" r="1.3" /><circle cx="33" cy="50" r="1.3" /><circle cx="41" cy="50" r="1.3" /></g>
      </g>
    </g>

    <g v-else-if="kind === 'games'">
      <path class="quick-nav-icon__surface" d="M28 26h24c7 0 10 5 12 12l4 15c2 8-5 12-10 6l-7-8H29l-7 8c-5 6-12 2-10-6l4-15c2-7 5-12 12-12Z" />
      <path class="quick-nav-icon__detail" d="M35 26v-4h10" />
      <g class="quick-nav-icon__game-left"><path d="M26 33v12m-6-6h12" /></g>
      <g class="quick-nav-icon__game-right"><circle class="quick-nav-icon__surface" cx="53" cy="36" r="3" /><circle class="quick-nav-icon__surface" cx="60" cy="43" r="3" /></g>
      <path class="quick-nav-icon__detail" d="M37 44h6" />
    </g>

    <g v-else-if="kind === 'leaderboard'">
      <path class="quick-nav-icon__detail" d="M12 64h56" />
      <rect class="quick-nav-icon__surface quick-nav-icon__bar quick-nav-icon__bar--left" x="16" y="38" width="12" height="22" rx="4" />
      <rect class="quick-nav-icon__surface quick-nav-icon__bar quick-nav-icon__bar--center" x="34" y="24" width="12" height="36" rx="4" />
      <rect class="quick-nav-icon__surface quick-nav-icon__bar quick-nav-icon__bar--right" x="52" y="32" width="12" height="28" rx="4" />
      <path class="quick-nav-icon__detail" d="m36 17 4-4 4 4" />
    </g>

    <g v-else class="quick-nav-icon__team">
      <path class="quick-nav-icon__detail" d="M34 25Q20 31 20 46m7 12q13 9 26 0m7-12Q60 31 46 25" />
      <circle class="quick-nav-icon__surface" cx="40" cy="20" r="8" />
      <circle class="quick-nav-icon__surface" cx="20" cy="54" r="8" />
      <circle class="quick-nav-icon__surface" cx="60" cy="54" r="8" />
      <circle class="quick-nav-icon__dots" cx="40" cy="43" r="2" />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ kind: 'forum' | 'games' | 'leaderboard' | 'team' }>()
</script>

<style scoped>
.quick-nav-icon {
  --icon-motion: var(--quick-nav-active, 0);
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  color: var(--color-primary-dark);
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.quick-nav-icon :is(g, path, rect, circle) {
  transition-property: transform, fill, opacity;
  transition-duration: var(--quick-nav-duration, 320ms);
  transition-timing-function: var(--ease-out-quint);
}
.quick-nav-icon__halo { fill: var(--color-primary-o03); stroke: var(--color-primary-o08); }
.quick-nav-icon__surface { fill: var(--quick-nav-icon-fill, #edf3fe); }
.quick-nav-icon__surface--front { fill: var(--quick-nav-icon-front, #fff); }
.quick-nav-icon__detail { opacity: calc(.55 + var(--quick-nav-active, 0) * .45); }
.quick-nav-icon__dots { fill: currentColor; stroke: none; opacity: calc(.65 + var(--quick-nav-active, 0) * .35); }
.quick-nav-icon__forum-back { transform: translate(calc(var(--icon-motion) * 2px), calc(var(--icon-motion) * -2px)); }
.quick-nav-icon__forum-front { transform: translate(calc(var(--icon-motion) * -2px), calc(var(--icon-motion) * 2px)); }
.quick-nav-icon__game-left { transform: translateX(calc(var(--icon-motion) * -2px)); }
.quick-nav-icon__game-right { transform: translateX(calc(var(--icon-motion) * 2px)); }
.quick-nav-icon__bar { transform-box: view-box; transform-origin: 40px 60px; }
.quick-nav-icon__bar--left, .quick-nav-icon__bar--right { transform: scaleY(calc(1 + var(--icon-motion) * .07)); }
.quick-nav-icon__bar--center { transform: scaleY(calc(1 + var(--icon-motion) * .1)); }
.quick-nav-icon__team { transform-origin: 40px 40px; transform: scale(calc(1 + var(--icon-motion) * .075)); }
@media (prefers-reduced-motion: reduce) {
  .quick-nav-icon { --icon-motion: 0; }
  .quick-nav-icon :is(g, path, rect, circle) { transition: none; }
}
</style>
