<template>
  <div>
    <div class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <p class="hero__badge">ABOUT DEVBIT · 关于我们</p>
          <h1 class="page-header__title about-title">从一 bit 灵感，<br><span>到一起创造。</span></h1>
          <p class="page-header__subtitle">把好奇写进代码，把经验分享给彼此。<br>在 DevBit，每一个微小的开始，都值得认真对待。</p>
        </div>
      </ScrollReveal>
    </div>

    <section class="about-section">
      <div class="container">
        <ScrollReveal>
          <section class="about-meaning" aria-labelledby="meaning-title" data-transition-group="card">
            <div class="about-meaning__name" aria-hidden="true"><span>Dev</span><span class="about-meaning__plus">+</span><span>Bit</span></div>
            <div>
              <h2 id="meaning-title">名字里的两份心意</h2>
              <p><strong>Dev，是开发，也是创造。</strong>把“如果可以”变成一个能运行、能体验、能帮助他人的作品。</p>
              <p><strong>Bit，是比特，也是点滴。</strong>一行代码、一次提问、一份耐心的回答，都是向前的最小一步。把这些小小的进步连接起来，就是 DevBit。</p>
            </div>
          </section>
        </ScrollReveal>
        <div class="about-principles">
          <ScrollReveal v-for="principle in principles" :key="principle.label" stretch>
            <section class="about-principle" data-transition-group="card">
              <p class="about-principle__label">{{ principle.label }}</p>
              <h2>{{ principle.title }}</h2>
              <p>{{ principle.description }}</p>
            </section>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <h2 class="section__title" style="margin-top: 3rem" data-transition-group="title">我们的团队</h2>
        </ScrollReveal>
        <div class="team-grid">
          <ScrollReveal v-for="member in team" :key="member.name" stretch>
            <div class="team-card" data-transition-group="card">
              <div class="team-card__avatar">{{ member.avatar }}</div>
              <div class="team-card__name">{{ member.name }}</div>
              <div class="team-card__role">{{ member.role }}</div>
            </div>
          </ScrollReveal>
        </div>
        <ScrollReveal>
          <section class="detail-panel" aria-labelledby="project-about-title" data-transition-group="card">
            <h2 id="project-about-title">我们正在创造什么</h2>
            <div class="info-grid">
              <article>
                <h3>交流社区</h3>
                <p>
                  用论坛记录技术问题、开发过程与作品灵感，让一个人的经验成为大家的参考。
                </p>
                <NuxtLink to="/forum">浏览讨论 →</NuxtLink>
              </article>
              <article>
                <h3>浏览器里的实验</h3>
                <p>从 Bevy 光影演示出发，探索代码、图形与交互带来的乐趣。</p>
                <NuxtLink to="/games">了解游戏实验 →</NuxtLink>
              </article>
            </div>
          </section>
        </ScrollReveal>
        <ScrollReveal>
          <section class="detail-panel" aria-labelledby="contribute-title" data-transition-group="card">
            <h2 id="contribute-title">从一个小贡献开始</h2>
            <ol class="guide-steps">
              <li>阅读仓库 README，了解项目结构与启动方式。</li>
              <li>
                先查看已有问题和讨论，选择文档修正、体验反馈或边界清楚的小改动。
              </li>
              <li>分享改动的原因和验证方式；界面改动可以附上前后截图。</li>
            </ol>
            <div class="page-tools" data-transition-group="content">
              <a
                href="https://github.com/Clearders/devbit-tech"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn--primary"
                >查看 GitHub 仓库 ↗</a
              ><NuxtLink to="/forum/new" class="btn btn--outline"
                >分享建议</NuxtLink
              >
            </div>
          </section>
        </ScrollReveal>
        <ScrollReveal>
          <section class="detail-panel" aria-labelledby="about-faq-title" data-transition-group="card">
            <h2 id="about-faq-title">常见问题</h2>
            <details class="info-disclosure">
              <summary>刚开始学习编程，也可以参与吗？</summary>
              <p>
                可以。一个描述清楚的问题、一段学习记录或一处文档修正，都是参与的起点。
              </p>
            </details>
            <details class="info-disclosure">
              <summary>怎样反馈问题更有帮助？</summary>
              <p>
                说明预期与实际行为，附上复现步骤、浏览器版本和错误信息。发布截图或日志前，请移除个人信息与密钥。
              </p>
            </details>
            <details class="info-disclosure">
              <summary>网站的功能都已开放了吗？</summary>
              <p>
                社区仍处于 Beta
                阶段。可以体验论坛与现有游戏；排行榜正在开发中，尚未开放排名。
              </p>
            </details>
          </section>
        </ScrollReveal>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const team = [
  { avatar: '👨‍💻', name: 'Clearders', role: '全栈前端工程师' },
  { avatar: '🧑‍🎨', name: 'EpsilonHunter', role: '全栈后端工程师' },
]
const principles = [
  { label: '01 / 使命', title: '让创造更容易开始', description: '用清楚的技术讨论、可体验的小实验和开放的协作，让学习者敢于提问，让开发者愿意分享，让想法有机会落地。' },
  { label: '02 / 愿景', title: '让点滴汇成共同的成长', description: '我们希望这里成为一个可以长期交流、反复尝试的开发者社区。经验能被接续，作品能得到回应，每个人都能找到同行者。' },
  { label: '03 / 行动', title: '做一点，分享一点', description: '从解决一个真实问题开始，记录过程，分享收获，也认真回应别人的尝试。保留玩心，在代码与游戏中发现创造的快乐。' },
]

useSeoMeta({
  title: '团队介绍 – DevBit Tech',
  description: 'Dev 是创造，Bit 是点滴。认识 DevBit Tech 的使命、团队，以及技术交流、游戏实验与开源参与方式。',
})
</script>

<style scoped>
.about-title { font-size: clamp(2rem, 4.5vw, 3.5rem); line-height: 1.25; }
.about-title span { color: var(--color-primary); }
.about-meaning { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(0, 1.6fr); align-items: center; gap: 40px; padding: 36px; background: linear-gradient(120deg, #fff, #f4f7fc); border: 1px solid var(--color-border-light); border-radius: 28px; box-shadow: var(--shadow-sm); }
.about-meaning__name { display: flex; align-items: center; justify-content: center; gap: 12px; font: 700 clamp(1.8rem, 3.4vw, 3rem) var(--font-display); letter-spacing: -.06em; }
.about-meaning__name span:first-child { color: var(--color-primary); }
.about-meaning__plus { font-size: 1.2rem; color: var(--color-text-muted); font-weight: 400; }
.about-meaning h2 { font-size: 1.25rem; margin-bottom: 18px; }
.about-meaning p:last-child { margin-bottom: 0; }
.about-principles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 24px; }
.about-principle { padding: 26px; border: 1px solid var(--color-border-light); border-radius: 22px; background: var(--color-surface); }
.about-principle .about-principle__label { color: var(--color-primary-dark); font-size: .75rem; font-weight: 600; letter-spacing: .08em; }
.about-principle h2 { font-size: 1.15rem; margin-bottom: 14px; }
.about-principle p:last-child { font-size: .9rem; margin-bottom: 0; }
@media (max-width: 760px) {
  .about-meaning { grid-template-columns: 1fr; gap: 24px; padding: 24px; }
  .about-meaning__name { justify-content: flex-start; }
  .about-principles { grid-template-columns: 1fr; gap: 14px; }
  .about-principle { padding: 24px; }
}
</style>
