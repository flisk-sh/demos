// Where the Flisk Board calls the api.
// On a *.localhost page (Flisk's local URLs) that is the api's Traefik route, or
// VITE_API_URL when Flisk set it. Anywhere else (the live tunnel) it is /api,
// which the app proxy on the runner sends to the same route.
const onLocalhost = window.location.hostname.endsWith('.localhost');

function localApiBase(): string {
  const { hostname, port, protocol } = window.location;
  const api = hostname.replace(/^app\./, 'api.');
  return `${protocol}//${api}${port ? `:${port}` : ''}/api/api`;
}

export const API_BASE: string = onLocalhost ? import.meta.env.VITE_API_URL || localApiBase() : '/api';

export type Item = { id: number; title: string; done: boolean };
export type Job = { id: number; status: 'queued' | 'done'; processedBy: string | null; doneAt: string | null };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, cache: 'no-store', headers: { 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const listItems = () => call<Item[]>('/items');
export const addItem = (title: string) => call<Item>('/items', { method: 'POST', body: JSON.stringify({ title }) });
export const setDone = (id: number, done: boolean) => call<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) });
export const removeItem = (id: number) => call<{ ok: boolean }>(`/items/${id}`, { method: 'DELETE' });
export const resetSeed = () => call<Item[]>('/seed/reset', { method: 'POST' });
export const queueJob = () => call<Job>('/jobs', { method: 'POST' });
export const getJob = (id: number) => call<Job>(`/jobs/${id}`);
export const lastWorkerJob = () => call<Job | null>('/jobs/last');
export const checkDb = () => call<{ ok: boolean }>('/health/db');

export async function checkApi(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: string };
    return { ok: body.status === 'ok', detail: body.status ?? 'no status' };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
