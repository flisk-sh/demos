// Keeps live demos moving without the Worker: run by .github/workflows/retry-live.yml.
//   - starts a live run again for a demo whose last live run failed (at most 3 runs a day per demo),
//   - deletes live/<id> branches whose run is over, so the demo page never shows dead links.
// Uses GITHUB_TOKEN only. `plan` is pure, so the rules are tested without GitHub.

const ACTIVE = new Set(["queued", "in_progress", "waiting", "requested", "pending"]);
const RETRY = new Set(["failure", "cancelled", "timed_out", "startup_failure"]);
const DAY = 24 * 60 * 60_000;

// "live <id>" (dispatch) or "live demo/<id>" (the trigger file in a demo branch).
export function idOf(title) {
  const m = /^live (?:demo\/)?([a-z0-9_-]{1,64})$/.exec(title ?? "");
  return m ? m[1] : null;
}

// runs: [{ title, status, conclusion, createdAt }], newest first.
// live: [{ id, until }] from the live/<id> branches (until is null when live.json is unreadable).
export function plan({ runs, live, now = Date.now(), maxLive = 20, perPass = 2, perDay = 3 }) {
  const byId = new Map();
  let running = 0;
  for (const run of runs) {
    const id = idOf(run.title);
    if (!id) continue;
    if (run.status === "in_progress") running += 1;
    if (now - Date.parse(run.createdAt) > DAY) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(run);
  }
  const liveIds = new Set(live.map((l) => l.id));
  const retry = [];
  for (const [id, list] of byId) {
    const [latest] = list;
    if (liveIds.has(id) || list.some((r) => ACTIVE.has(r.status))) continue;
    if (latest.status !== "completed" || !RETRY.has(latest.conclusion)) continue;
    if (list.length >= perDay) continue;
    retry.push(id);
  }
  const room = Math.max(0, maxLive - running);
  return {
    retry: retry.slice(0, Math.min(perPass, room)),
    // A run that died without its down step leaves its branch behind; 10 minutes of grace.
    drop: live.filter((l) => !Number.isFinite(l.until) || l.until + 10 * 60_000 < now).map((l) => l.id),
  };
}

async function main() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, MAX_LIVE } = process.env;
  const api = async (path, init = {}) => {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "flisk-demos", ...init.headers },
    });
    if (!res.ok && res.status !== 404) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
    return res;
  };

  const since = new Date(Date.now() - DAY).toISOString();
  const runs = [];
  for (let page = 1; page <= 3; page += 1) {
    const body = await (await api(`/actions/runs?per_page=100&page=${page}&created=%3E%3D${since}`)).json();
    runs.push(...body.workflow_runs.map((r) => ({ title: r.display_title, status: r.status, conclusion: r.conclusion, createdAt: r.created_at })));
    if (body.workflow_runs.length < 100) break;
  }
  // A run started more than a day ago may still be live; count it as running too.
  const inProgress = await (await api("/actions/runs?status=in_progress&per_page=100")).json();
  for (const r of inProgress.workflow_runs) {
    if (!runs.some((x) => x.title === r.display_title && x.createdAt === r.created_at)) {
      runs.push({ title: r.display_title, status: r.status, conclusion: r.conclusion, createdAt: r.created_at });
    }
  }

  const refs = await (await api("/git/matching-refs/heads/live/")).json();
  const live = [];
  for (const { ref } of refs) {
    const id = ref.replace("refs/heads/live/", "");
    const res = await api(`/contents/live.json?ref=${encodeURIComponent(`live/${id}`)}`, { headers: { accept: "application/vnd.github.raw+json" } });
    const body = res.ok ? await res.json().catch(() => null) : null;
    live.push({ id, until: body?.until ?? null });
  }

  const { retry, drop } = plan({ runs, live, maxLive: Number(MAX_LIVE || 20) });
  for (const id of drop) {
    await api(`/git/refs/heads/live/${id}`, { method: "DELETE" });
    console.log(`dropped stale live/${id}`);
  }
  for (const id of retry) {
    // The demo branch must still exist; a demo whose branch is gone has nothing to run.
    const branch = await api(`/git/ref/heads/demo/${id}`);
    if (branch.status === 404) continue;
    await api("/actions/workflows/live.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { id } }) });
    console.log(`retried live ${id}`);
  }
  console.log(`runs seen: ${runs.length}, live branches: ${live.length}, retried: ${retry.length}, dropped: ${drop.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
