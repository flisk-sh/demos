<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import plan from './demo-plan.json';
import { API_BASE, checkApi } from './demo-api';

type Health = 'checking' | 'ok' | 'down';

const health = ref<Health>('checking');
const detail = ref('');
const commands = plan.commands.join('\n');

async function refresh() {
  const result = await checkApi();
  health.value = result.ok ? 'ok' : 'down';
  detail.value = result.detail;
}

let timer: number | undefined;
onMounted(() => {
  refresh();
  timer = window.setInterval(refresh, 10_000);
});
onUnmounted(() => window.clearInterval(timer));

const label = computed(() => ({ checking: 'checking', ok: 'healthy', down: 'unreachable' })[health.value]);
</script>

<template>
  <main class="page">
    <header>
      <p class="eyebrow">Flisk demo</p>
      <h1>@{{ plan.handle }}'s stack is running</h1>
      <p class="summary">{{ plan.stack }} · {{ plan.summary }}</p>
      <p class="status" :data-state="health" :title="detail">
        <span class="dot" aria-hidden="true" />
        API {{ label }}
        <code>{{ API_BASE }}/health</code>
      </p>
    </header>

    <section class="cards" aria-label="Services">
      <article v-for="service in plan.services" :key="service.name" class="card">
        <h2>{{ service.name }}</h2>
        <p class="type">{{ service.appType }}</p>
        <p class="note">{{ service.note }}</p>
      </article>
    </section>

    <section class="run">
      <h2>How to run this yourself</h2>
      <pre><code>{{ commands }}</code></pre>
    </section>
  </main>
</template>

<style>
/* Global on purpose: the variables live on :root, which scoped styles would not match. */
:root {
  --bg: #f6f7f9;
  --fg: #15171c;
  --muted: #5d6470;
  --card: #ffffff;
  --line: #dfe3ea;
  --accent: #2f6fed;
  --ok: #1f9d55;
  --down: #d64545;
  --code-bg: #0f1218;
  --code-fg: #e6e9ef;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #0e1116;
    --fg: #e8ebf0;
    --muted: #9aa3b2;
    --card: #161b22;
    --line: #2a313c;
    --accent: #6c9bff;
  }
}

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2.5rem 1rem 4rem;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--fg);
  background: var(--bg);
  min-height: 100vh;
  box-sizing: border-box;
}
header { margin-bottom: 2rem; }
.eyebrow { margin: 0; color: var(--accent); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; }
h1 { margin: 0.25rem 0 0.5rem; font-size: clamp(1.6rem, 4vw, 2.3rem); overflow-wrap: anywhere; }
.summary { margin: 0; color: var(--muted); }
.status { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 1rem 0 0; }
.status code { color: var(--muted); overflow-wrap: anywhere; }
.dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--muted); }
.status[data-state='ok'] .dot { background: var(--ok); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ok) 25%, transparent); }
.status[data-state='down'] .dot { background: var(--down); }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.1rem; }
.card h2 { margin: 0; font-size: 1.1rem; overflow-wrap: anywhere; }
.type { margin: 0.25rem 0 0.5rem; color: var(--accent); font-size: 0.85rem; font-weight: 600; }
.note { margin: 0; color: var(--muted); font-size: 0.95rem; }

.run { margin-top: 2.5rem; }
.run h2 { font-size: 1.2rem; margin: 0 0 0.75rem; }
pre { margin: 0; padding: 1rem; background: var(--code-bg); color: var(--code-fg); border-radius: 12px; overflow-x: auto; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; }
</style>
