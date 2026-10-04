<script setup lang="ts">
defineProps<{ stretch?: boolean }>()
</script>

<template>
  <!-- Observe this stationary box; animate only its inner layer. -->
  <div class="scroll-reveal" :class="{ 'scroll-reveal--stretch': stretch }" data-scroll-reveal>
    <div class="scroll-reveal__motion" data-scroll-reveal-motion>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scroll-reveal,
.scroll-reveal__motion {
  display: flow-root;
  min-width: 0;
}
.scroll-reveal--stretch,
.scroll-reveal--stretch > .scroll-reveal__motion {
  display: grid;
}
</style>
