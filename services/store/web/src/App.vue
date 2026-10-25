<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import plan from './demo-plan.json';
import './demo-board.css';
import {
  API_BASE, addItem, checkApi, checkDb, getJob, lastWorkerJob, listItems, queueJob, removeItem, resetSeed, setDone,
  type Item, type Job,
} from './demo-api';

type Dot = 'checking' | 'ok' | 'down' | 'idle';
const LABEL: Record<Dot, string> = { checking: 'checking', ok: 'healthy', down: 'unreachable', idle: 'no job yet' };
const { noun, one, seedFile, hasJobs } = plan.board;

const items = ref<Item[]>([]);
const title = ref('');
const error = ref('');
const api = ref<Dot>('checking');
const postgres = ref<Dot>('checking');
const worker = ref<Dot>('checking');
const lastJob = ref<Job | null>(null);
const jobs = ref<Job[]>([]);
const leaving = ref<number | null>(null);
// Bumped on reset, so every bubble is a new element and pops in again.
const generation = ref(0);

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '');
const workerDetail = computed(() => (lastJob.value?.doneAt ? `last job ${time(lastJob.value.doneAt)}` : 'no worker job yet'));
// Each bubble drifts on its own clock, so the pond does not move in step.
const drift = (id: number) => ({ animationDelay: `${-((id * 1.7) % 6)}s` });

document.title = 'Flisk Board';

// The list and the status row refresh every 3 seconds, so a teammate's change shows up here too.
async function refresh() {
  const [a, db, last, rows] = await Promise.allSettled([checkApi(), checkDb(), lastWorkerJob(), listItems()]);
  api.value = a.status === 'fulfilled' && a.value.ok ? 'ok' : 'down';
  postgres.value = db.status === 'fulfilled' && db.value.ok ? 'ok' : 'down';
  if (last.status === 'fulfilled') {
    worker.value = last.value ? 'ok' : 'idle';
    lastJob.value = last.value;
  } else worker.value = 'down';
  if (rows.status === 'fulfilled') items.value = rows.value;
  else error.value = message(rows.reason);
}

let timer: number | undefined;
onMounted(() => {
  refresh();
  timer = window.setInterval(refresh, 3000);
});

// Polls every queued job bubble until the worker (or the api fallback) marks it done.
let jobTimer: number | undefined;
const queued = computed(() => jobs.value.filter((j) => j.status === 'queued').map((j) => j.id).join(','));
watch(
  queued,
  (ids) => {
    window.clearInterval(jobTimer);
    if (!ids) return;
    jobTimer = window.setInterval(async () => {
      for (const id of ids.split(',').map(Number)) {
        try {
          const next = await getJob(id);
          jobs.value = jobs.value.map((j) => (j.id === id ? next : j));
        } catch (err) {
          error.value = message(err);
        }
      }
    }, 500);
  },
  { immediate: true },
);

onUnmounted(() => {
  window.clearInterval(timer);
  window.clearInterval(jobTimer);
});

async function act(action: () => Promise<unknown>): Promise<boolean> {
  error.value = '';
  try {
    await action();
    items.value = await listItems();
    return true;
  } catch (err) {
    error.value = message(err);
    return false;
  }
}

async function onAdd() {
  if (await act(() => addItem(title.value))) title.value = '';
}

async function onReset() {
  if (await act(resetSeed)) generation.value += 1;
}

// The bubble shrinks away first, then the row is deleted.
function onDelete(item: Item) {
  leaving.value = item.id;
  window.setTimeout(async () => {
    leaving.value = null;
    await act(() => removeItem(item.id));
  }, 220);
}

async function onRunJob() {
  error.value = '';
  try {
    const job = await queueJob();
    jobs.value = [job, ...jobs.value].slice(0, 4);
  } catch (err) {
    error.value = message(err);
  }
}
</script>

<template>
  <main class="page">
    <header>
      <p class="eyebrow">Flisk Board · {{ plan.stack }}</p>
      <h1>Flisk Board</h1>
      <p class="summary">@{{ plan.handle }} · {{ plan.summary }}</p>
      <ul class="status" aria-label="Services">
        <li data-state="ok" title="this page"><span class="dot" aria-hidden="true" />web <span class="muted">healthy</span></li>
        <li :data-state="api" :title="`${API_BASE}/health`"><span class="dot" aria-hidden="true" />api <span class="muted">{{ LABEL[api] }}</span></li>
        <li :data-state="postgres" title="select 1 through /health/db"><span class="dot" aria-hidden="true" />postgres <span class="muted">{{ LABEL[postgres] }}</span></li>
        <li v-if="hasJobs" :data-state="worker" :title="workerDetail"><span class="dot" aria-hidden="true" />worker <span class="muted">{{ LABEL[worker] }}</span></li>
      </ul>
      <p class="hint">Edit services/{{ plan.stack }}/web/src/App.* and save, it reloads.</p>
    </header>

    <section class="panel seed">
      <p>🌱 Seeded from {{ seedFile }}: everyone on the team starts from the same rows</p>
      <button @click="onReset">Reset to seed</button>
    </section>

    <section class="panel">
      <h2>{{ noun }}</h2>
      <form class="add" @submit.prevent="onAdd">
        <input v-model="title" type="text" :placeholder="`New ${one}`" :aria-label="`New ${one}`" maxlength="120" />
        <button type="submit">Add {{ one }}</button>
      </form>
      <ul class="pond" :aria-label="`${noun}, as bubbles`">
        <li
          v-for="item in items"
          :key="`${generation}-${item.id}`"
          :class="['bubble-wrap', { leaving: leaving === item.id }]"
        >
          <button
            type="button"
            class="bubble"
            :aria-pressed="item.done ? 'true' : 'false'"
            :style="drift(item.id)"
            @click="act(() => setDone(item.id, !item.done))"
          >
            <span class="bubble-title">{{ item.title }}</span>
            <span v-if="item.done" class="check" aria-hidden="true">✓</span>
          </button>
          <button type="button" class="bubble-x" :aria-label="`Delete ${item.title}`" @click="onDelete(item)">✕</button>
        </li>
        <template v-if="hasJobs">
          <li v-for="job in jobs" :key="`job-${job.id}`" class="bubble-wrap">
            <div class="bubble job" :data-state="job.status" :style="drift(job.id)" aria-live="polite">
              <span class="bubble-title">Job #{{ job.id }}</span>
              <span class="bubble-sub">{{ job.status === 'done' ? `done · processed by ${job.processedBy}` : 'queued…' }}</span>
            </div>
          </li>
        </template>
        <li v-if="items.length === 0" class="empty">No {{ noun }} yet. Add one, or reset to seed.</li>
      </ul>
    </section>

    <section v-if="hasJobs" class="panel">
      <h2>Background job</h2>
      <p class="muted">The api queues a row in board_jobs, and the jobs worker picks it up within a second.</p>
      <button @click="onRunJob">Run background job</button>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="run">
      <h2>How to run this yourself</h2>
      <pre><code>{{ plan.commands.join('\n') }}</code></pre>
    </section>
  </main>
</template>
