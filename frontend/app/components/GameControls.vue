<template>
  <div class="game-controls">
    <p>
      建议使用带键盘的桌面浏览器。先按空格对比泛光开关，再逐项调整；参数调整需要开启
      Bloom。
    </p>
    <dl>
      <div v-for="control in controls" :key="control.keys">
        <dt>
          <kbd>{{ control.keys }}</kbd>
        </dt>
        <dd>{{ control.action }}</dd>
      </div>
    </dl>
    <p>
      成对键位中，前一个增加、后一个减少；T / G
      为模式选择。切换色调映射后，可观察亮部颜色与对比度的变化。
    </p>
  </div>
</template>
<script setup lang="ts">
const controls = [
  { keys: 'Space', action: '开启 / 关闭 Bloom 泛光' },
  { keys: 'O', action: '循环切换色调映射' },
  { keys: 'Q / A', action: '泛光强度' },
  { keys: 'W / S', action: '低频增强' },
  { keys: 'E / D', action: '低频增强曲率' },
  { keys: 'R / F', action: '高通频率' },
  { keys: 'T / G', action: '能量守恒 / 加法合成' },
  { keys: 'Y / H', action: '预过滤阈值' },
  { keys: 'U / J', action: '阈值柔和度' },
  { keys: 'I / K', action: '横向泛光比例' },
]
</script>
<style scoped>
.game-controls {
  font-size: 0.88rem;
  line-height: 1.8;
}
.game-controls p {
  margin: 0.75rem 0;
}
.game-controls dl > div {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  gap: 0.7rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--color-border);
}
kbd {
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
</style>
