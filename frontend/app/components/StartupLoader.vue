<script setup lang="ts">
import { initializeStartupLoading } from '~/utils/startupLoading'

// This body-close script starts the visible clock before deferred bundles load.
onPrehydrate(() => window.__devbitStartupLoading?.start())

// SSR-only head tags run before the body can paint, even with delayed app JS.
// With JavaScript disabled no gate is set, so the server-rendered site is usable.
useServerHead({
  script: [{ key: 'startup-gate', tagPriority: 'critical', innerHTML: `(${initializeStartupLoading.toString()})(window,document,performance)` }],
  style: [{ key: 'startup-critical', tagPriority: 'critical', innerHTML: `
    .startup-loader{display:none}
    html[data-devbit-startup]:not(.is-game){overflow:hidden}
    html[data-devbit-startup='loading']:not(.is-game) .app-shell__content{visibility:hidden;opacity:0}
    html[data-devbit-startup]:not(.is-game) .startup-loader{display:grid;position:fixed;inset:0;z-index:1000;place-items:center;min-height:100dvh;color:#1e1e2e;font-family:'Segoe UI',sans-serif}
    html[data-devbit-startup='loading']:not(.is-game) .startup-loader{background:#f7f5f2}
    .startup-loader__content{position:relative;text-align:center}
    .startup-loader__brand{font-size:clamp(32px,5vw,52px);font-weight:700}
    .startup-loader__brand-accent{color:#5b8def}
    .startup-loader__stage{display:none}
    html:not([data-devbit-startup-stage]) .startup-loader__stage--initializing{display:inline}
  ` }],
})
</script>

<template>
  <div class="startup-loader" role="status" aria-live="polite" aria-atomic="true">
    <div class="startup-loader__curtain startup-loader__curtain--trail" aria-hidden="true" />
    <div class="startup-loader__curtain startup-loader__curtain--front" aria-hidden="true" />
    <div class="startup-loader__content">
      <div class="startup-loader__orbit" aria-hidden="true"><i /><i /><i /></div>
      <div class="startup-loader__brand" aria-hidden="true">
        <span class="startup-loader__brand-accent">Dev</span><span>Bit Tech</span>
      </div>
      <div class="startup-loader__track" role="progressbar" aria-label="网站启动阶段" aria-valuemin="0" aria-valuemax="100">
        <span class="startup-loader__completion" />
      </div>
      <div class="startup-loader__readout">
        <p class="startup-loader__label">
          <span class="startup-loader__stage startup-loader__stage--initializing">初始化</span>
          <span class="startup-loader__stage startup-loader__stage--session">检查会话</span>
          <span class="startup-loader__stage startup-loader__stage--page">准备页面</span>
          <span class="startup-loader__stage startup-loader__stage--ready">即将进入</span>
        </p>
        <span class="startup-loader__number" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<style>
.nuxt-loading-indicator {
  background-color: var(--color-primary, #5b8def);
  box-shadow: 0 0 10px var(--color-primary-glow);
  transition: transform 160ms linear, opacity 180ms ease-out !important;
}
html:not(.is-game) { scrollbar-gutter: stable; }
html[data-devbit-startup] .nuxt-loading-indicator { visibility: hidden; }
html[data-devbit-startup]:not(.is-game) .app-shell__content { pointer-events: none; }
html[data-devbit-startup='loading']:not(.is-game) :is(.app-shell__background, .app-shell__overlay) { opacity: 0; }
html[data-devbit-startup='leaving']:not(.is-game) :is(.app-shell__background, .app-shell__overlay) {
  animation: devbit-startup-ambient 1000ms ease-out both;
}

.startup-loader {
  display: none;
  --startup-ease: cubic-bezier(0.76, 0, 0.24, 1);
  overflow: hidden;
  isolation: isolate;
  padding: 24px;
  pointer-events: auto;
}
.startup-loader__curtain { position: absolute; inset: 0; }
.startup-loader__curtain--trail { background: var(--color-border-focus, #c5d5f6); }
.startup-loader__curtain--front {
  background: radial-gradient(ellipse at 50% 48%, var(--color-primary-o08, rgba(91,141,239,.08)), transparent 52%), var(--color-bg, #f7f5f2);
}
html[data-devbit-startup='leaving'] .startup-loader__curtain--front {
  animation: devbit-startup-curtain 840ms var(--startup-ease) both;
}
html[data-devbit-startup='leaving'] .startup-loader__curtain--trail {
  animation: devbit-startup-curtain 840ms 70ms var(--startup-ease) both;
}
.startup-loader__content {
  z-index: 1;
  width: min(320px, 80vw);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.startup-loader__brand {
  display: flex;
  overflow: hidden;
  font-family: var(--font-display, 'Segoe UI', sans-serif);
  line-height: 1.4;
  letter-spacing: -0.045em;
  white-space: nowrap;
}
html[data-devbit-startup] .startup-loader__brand > span {
  animation: devbit-startup-word 800ms var(--ease-out-quint, cubic-bezier(.22,1,.36,1)) both;
}
html[data-devbit-startup] .startup-loader__brand > span + span { animation-delay: 90ms; }
.startup-loader__orbit {
  position: absolute;
  width: min(72vw, 400px);
  aspect-ratio: 1;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
  pointer-events: none;
}
.startup-loader__orbit i { position: absolute; inset: 0; border: 1px solid var(--color-primary-o12); border-radius: 50%; }
.startup-loader__orbit i:nth-child(2) { inset: 12%; border-color: var(--color-primary-o06); }
.startup-loader__orbit i:nth-child(3) { inset: -12%; border-color: var(--color-primary-o04); }
html[data-devbit-startup] .startup-loader__orbit { animation: devbit-startup-orbit-enter 1000ms var(--ease-out-quint) both; }
html[data-devbit-startup] .startup-loader__orbit i:first-child { animation: devbit-startup-orbit 8s linear infinite; }
.startup-loader__orbit i:first-child::after {
  content: ''; position: absolute; top: 50%; left: -3px; width: 5px; height: 5px;
  border-radius: 50%; background: var(--color-primary); box-shadow: 0 0 16px var(--color-primary-glow);
}
.startup-loader__track {
  position: relative; width: 200px; height: 2px; margin-top: 28px;
  overflow: hidden; border-radius: 2px; background: var(--color-primary-o12, rgba(91,141,239,.12));
}
.startup-loader__completion {
  position: absolute; inset: 0; background: var(--color-primary, #5b8def);
  transform: scaleX(var(--devbit-startup-progress, 0)); transform-origin: left;
  transition: transform 180ms var(--ease-out-quint);
}
.startup-loader__readout {
  display: flex; width: 200px; align-items: center; justify-content: space-between; margin-top: 14px;
  color: var(--color-text-secondary, #4a4a5e); font-size: 12px; line-height: 1.6;
}
.startup-loader__label { margin: 0; }
.startup-loader__number { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-primary); }
.startup-loader__number::after { content: '00'; }
html[data-devbit-startup-stage='25'] .startup-loader__number::after { content: '25'; }
html[data-devbit-startup-stage='65'] .startup-loader__number::after { content: '65'; }
html[data-devbit-startup-stage='100'] .startup-loader__number::after { content: '100'; }
html[data-devbit-startup-stage='25'] .startup-loader__stage--session,
html[data-devbit-startup-stage='65'] .startup-loader__stage--page,
html[data-devbit-startup-stage='100'] .startup-loader__stage--ready { display: inline; }
html[data-devbit-startup] :is(.startup-loader__track, .startup-loader__readout) {
  animation: devbit-startup-detail 650ms 180ms var(--ease-out-quint) both;
}
html[data-devbit-startup='leaving'] .startup-loader__content {
  animation: devbit-startup-brand-exit 420ms cubic-bezier(.4,0,.2,1) both;
}

/* Reveal the actual page underneath the two curtains, from headline to actions. */
html[data-devbit-startup='leaving']:not(.is-game) :is(.navbar, .footer, [data-transition-group]) {
  animation: devbit-startup-reveal 560ms var(--startup-reveal-delay, 440ms) var(--ease-out-quint) both;
}
html[data-devbit-startup='leaving'] [data-transition-group='content'] { --startup-reveal-delay: 500ms; }
html[data-devbit-startup='leaving'] [data-transition-group='card'] { --startup-reveal-delay: 540ms; }
html[data-devbit-startup='leaving'] .hero__badge { --startup-reveal-delay: 380ms; }
html[data-devbit-startup='leaving'] .hero__actions { --startup-reveal-delay: 560ms; }
html[data-devbit-startup='leaving'] :is(.navbar, .footer) { --startup-reveal-delay: 480ms; }
/* Nested groups should move once, with their parent. */
html[data-devbit-startup='leaving'] [data-transition-group] [data-transition-group] { animation: none; }

@keyframes devbit-startup-word {
  from { opacity: 0; transform: translateY(105%) rotate(4deg); }
  to { opacity: 1; transform: translateY(0) rotate(0); }
}
@keyframes devbit-startup-detail {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes devbit-startup-orbit-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(.82); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes devbit-startup-orbit { to { transform: rotate(360deg); } }
@keyframes devbit-startup-brand-exit {
  to { opacity: 0; transform: translateY(-48px) scale(.96); }
}
@keyframes devbit-startup-curtain {
  0% { transform: translateY(0); border-radius: 0; }
  45% { border-radius: 0 0 50% 50% / 0 0 12% 12%; }
  100% { transform: translateY(-101%); border-radius: 0; }
}
@keyframes devbit-startup-reveal {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes devbit-startup-ambient { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 640px) {
  .startup-loader__track, .startup-loader__readout { width: 168px; }
  @keyframes devbit-startup-reveal {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
@media (prefers-reduced-motion: reduce) {
  html[data-devbit-startup] .startup-loader *,
  html[data-devbit-startup='leaving'] :is(.navbar, .footer, [data-transition-group], .app-shell__background, .app-shell__overlay) {
    animation: none !important; transition: none !important;
  }
  .nuxt-loading-indicator { transition: none !important; }
}
</style>
