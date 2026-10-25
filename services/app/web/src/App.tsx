import { useEffect, useState, type FormEvent } from 'react';
import plan from './demo-plan.json';
import './demo-board.css';
import {
  API_BASE, addItem, checkApi, checkDb, getJob, lastWorkerJob, listItems, queueJob, removeItem, resetSeed, setDone,
  type Item, type Job,
} from './demo-api';

type Dot = 'checking' | 'ok' | 'down' | 'idle';
const LABEL: Record<Dot, string> = { checking: 'checking', ok: 'healthy', down: 'unreachable', idle: 'no job yet' };
const { noun, one, seedFile, hasJobs } = plan.board;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '');

function Status({ name, state, detail }: { name: string; state: Dot; detail: string }) {
  return (
    <li data-state={state} title={detail}>
      <span className="dot" aria-hidden="true" />
      {name} <span className="muted">{LABEL[state]}</span>
    </li>
  );
}

function App() {
  useEffect(() => {
    document.title = 'Flisk Board';
  }, []);
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [api, setApi] = useState<Dot>('checking');
  const [postgres, setPostgres] = useState<Dot>('checking');
  const [worker, setWorker] = useState<Dot>('checking');
  const [lastJob, setLastJob] = useState<Job | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  // The list and the status row refresh every 3 seconds, so a teammate's change shows up here too.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [a, db, last, rows] = await Promise.allSettled([checkApi(), checkDb(), lastWorkerJob(), listItems()]);
      if (!alive) return;
      setApi(a.status === 'fulfilled' && a.value.ok ? 'ok' : 'down');
      setPostgres(db.status === 'fulfilled' && db.value.ok ? 'ok' : 'down');
      if (last.status === 'fulfilled') {
        setWorker(last.value ? 'ok' : 'idle');
        setLastJob(last.value);
      } else setWorker('down');
      if (rows.status === 'fulfilled') setItems(rows.value);
      else setError(message(rows.reason));
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  // Polls the queued job every half second until the worker (or the api fallback) marks it done.
  const jobId = job?.id;
  const jobDone = job?.status === 'done';
  useEffect(() => {
    if (jobId === undefined || jobDone) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await getJob(jobId);
        setJob(next);
      } catch (err) {
        setError(message(err));
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [jobId, jobDone]);

  async function act(action: () => Promise<unknown>): Promise<boolean> {
    setError('');
    try {
      await action();
      setItems(await listItems());
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    }
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (await act(() => addItem(title))) setTitle('');
  }

  async function onRunJob() {
    setError('');
    try {
      setJob(await queueJob());
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <main className="page">
      <header>
        <p className="eyebrow">Flisk Board · {plan.stack}</p>
        <h1>Flisk Board</h1>
        <p className="summary">
          @{plan.handle} · {plan.summary}
        </p>
        <ul className="status" aria-label="Services">
          <Status name="web" state="ok" detail="this page" />
          <Status name="api" state={api} detail={`${API_BASE}/health`} />
          <Status name="postgres" state={postgres} detail="select 1 through /health/db" />
          {hasJobs && (
            <Status name="worker" state={worker} detail={lastJob?.doneAt ? `last job ${time(lastJob.doneAt)}` : 'no worker job yet'} />
          )}
        </ul>
        <p className="hint">Edit services/{plan.stack}/web/src/App.* and save, it reloads.</p>
      </header>

      <section className="panel seed">
        <p>🌱 Seeded from {seedFile}: everyone on the team starts from the same rows</p>
        <button onClick={() => act(resetSeed)}>Reset to seed</button>
      </section>

      <section className="panel">
        <h2>{noun}</h2>
        <form className="add" onSubmit={onAdd}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`New ${one}`} aria-label={`New ${one}`} maxLength={120} />
          <button type="submit">Add {one}</button>
        </form>
        <ul className="items">
          {items.map((item) => (
            <li key={item.id} className="item" data-done={item.done}>
              <label>
                <input type="checkbox" checked={item.done} onChange={() => act(() => setDone(item.id, !item.done))} />
                <span>{item.title}</span>
              </label>
              <button className="ghost" onClick={() => act(() => removeItem(item.id))}>
                Delete
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="muted">No {noun} yet. Add one, or reset to seed.</li>}
        </ul>
      </section>

      {hasJobs && (
        <section className="panel job-box">
          <h2>Background job</h2>
          <p className="muted">The api queues a row in board_jobs, and the jobs worker picks it up within a second.</p>
          <button onClick={onRunJob}>Run background job</button>
          {job && (
            <p className="job">
              Job #{job.id}:{' '}
              {job.status === 'done' ? `done, processed by ${job.processedBy} at ${time(job.doneAt)}` : 'queued'}
            </p>
          )}
        </section>
      )}

      {error && <p className="error">{error}</p>}

      <section className="run">
        <h2>How to run this yourself</h2>
        <pre>
          <code>{plan.commands.join('\n')}</code>
        </pre>
      </section>
    </main>
  );
}

export default App;
