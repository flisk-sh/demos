// The Flisk Board api: items in Postgres, a seed you can reset to, and a job queue
// that the jobs worker drains. Plain SQL through Bun's built-in client, so the
// Board's own tables never touch Prisma.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SQL } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// No argument: Bun reads DATABASE_URL, which Flisk provides.
const sql = new SQL();
const SEED = join(import.meta.dir, '..', 'seed.sql');

const SCHEMA = [
  `create table if not exists board_items (id serial primary key, title text not null, done boolean not null default false, created_at timestamptz not null default now())`,
  `create table if not exists board_jobs (id serial primary key, status text not null default 'queued', processed_by text, queued_at timestamptz not null default now(), done_at timestamptz)`,
];

// The seed file is one insert per line. Titles never contain a semicolon.
async function applySeed() {
  const statements = readFileSync(SEED, 'utf8').split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) await sql.unsafe(statement);
  await sql`select setval(pg_get_serial_sequence('board_items', 'id'), (select coalesce(max(id), 0) + 1 from board_items), false)`;
}

async function ensureSchema() {
  for (const statement of SCHEMA) await sql.unsafe(statement);
  const [{ count }] = await sql`select count(*)::int as count from board_items`;
  if (count === 0) await applySeed();
}

// Postgres may come up after the api. Keep retrying in the background; routes answer 500 until it is ready.
async function waitForDb() {
  for (;;) {
    try {
      await ensureSchema();
      return;
    } catch (err) {
      console.log('board: waiting for postgres', String(err));
      await Bun.sleep(2000);
    }
  }
}

// If no worker has picked a queued job up after 3 seconds, the api marks it done and says so in the row.
async function fallback(id: number) {
  await sql`update board_jobs set status = 'done', processed_by = 'api (no worker picked it up in 3s)', done_at = now() where id = ${id} and status = 'queued'`;
}

const app = new Hono();

// The demo web calls this api from another *.localhost origin during local runs.
app.use('*', cors({ origin: (origin) => (/^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin) ? origin : null) }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/health/db', async (c) => {
  try {
    await sql`select 1`;
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: 'postgres unreachable' }, 503);
  }
});

const items = () => sql`select id, title, done from board_items order by id`;

app.get('/items', async (c) => c.json(await items()));

app.post('/items', async (c) => {
  const { title } = await c.req.json<{ title?: string }>();
  const text = title?.trim();
  if (!text) return c.json({ error: 'title is required' }, 400);
  const [item] = await sql`insert into board_items (title) values (${text}) returning id, title, done`;
  return c.json(item, 201);
});

app.patch('/items/:id', async (c) => {
  const { done } = await c.req.json<{ done?: boolean }>();
  const [item] = await sql`update board_items set done = ${Boolean(done)} where id = ${Number(c.req.param('id'))} returning id, title, done`;
  return item ? c.json(item) : c.json({ error: 'not found' }, 404);
});

app.delete('/items/:id', async (c) => {
  await sql`delete from board_items where id = ${Number(c.req.param('id'))}`;
  return c.json({ ok: true });
});

app.post('/seed/reset', async (c) => {
  await sql`truncate board_items restart identity`;
  await applySeed();
  return c.json(await items());
});

// The last job the worker processed. The status row shows its time.
app.get('/jobs/last', async (c) => {
  const [job] = await sql`select id, status, processed_by as "processedBy", done_at as "doneAt" from board_jobs where processed_by = 'jobs' order by done_at desc limit 1`;
  return c.json(job ?? null);
});

app.post('/jobs', async (c) => {
  const [job] = await sql`insert into board_jobs (status) values ('queued') returning id, status, processed_by as "processedBy", done_at as "doneAt"`;
  setTimeout(() => void fallback(job.id), 3000);
  return c.json(job, 201);
});

app.get('/jobs/:id', async (c) => {
  const [job] = await sql`select id, status, processed_by as "processedBy", done_at as "doneAt" from board_jobs where id = ${Number(c.req.param('id'))}`;
  return job ? c.json(job) : c.json({ error: 'not found' }, 404);
});

void waitForDb();

export default { port: Number(process.env.PORT) || 3000, fetch: app.fetch };
