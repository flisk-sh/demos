// Where the demo dashboard calls the api.
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
