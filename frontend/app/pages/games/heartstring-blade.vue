<!--
  Heartstring Blade — Bevy 2D bloom post-processing demo
  Press Space to toggle bloom, O to cycle tonemapping,
  Q/A, W/S, E/D, R/F, T/G, Y/H, U/J, I/K to adjust parameters.
-->
<script setup lang="ts">
definePageMeta({ layout: 'game' })

useSeoMeta({
  title: 'Heartstring Blade – DevBit 游戏',
  description: 'Bevy 2D bloom 后期特效演示 — 交互式调整 bloom 参数和色调映射',
})
</script>

<template>
  <GameWasmLoader
    wasm-path="/games/heartstring_blade/heartstring_blade.js"
    title="Heartstring Blade"
    hint="Bloom 后期特效演示 · 键盘交互"
  />
</template>
