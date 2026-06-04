<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <div class="app-shell__background" aria-hidden="true">
      <DynamicBackground layer="base" />
    </div>
    <div class="app-shell__content">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
    <div class="app-shell__overlay" aria-hidden="true">
      <DynamicBackground layer="overlay" />
    </div>
  </div>
</template>
