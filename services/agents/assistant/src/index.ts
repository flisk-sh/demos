import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Contract with Flisk (see docs/agents/ai-agents.md):
//   AGENT_DURABILITY  files   (set by flisk from service.json agent.durability)
//   AGENT_STATE_DIR   where files-durability checkpoints live (a named volume that survives flisk down)
//   PORT              port to listen on
// /health: the process is alive. /ready: the checkpoint store is reachable. Idle is healthy, so /health never checks the store.

const DURABILITY = 'files';
const STATE_DIR = process.env.AGENT_STATE_DIR || join(process.cwd(), '.agent-state');
const PORT = Number(process.env.PORT || 3000);
const DRAIN_TIMEOUT_MS = 10_000;

interface Checkpoint {
  sessionId: string;
  messages: Array<{ role: 'user' | 'agent'; content: string; at: string }>;
}

// One row of GET /sessions: what is stored, not what is in it, so listing never reads a whole conversation.
interface SessionSummary {
  sessionId: string;
  lastActivity: string;
  checkpointBytes: number;
}

// Session store. files: one JSON checkpoint per session, written atomically (temp file, then rename), so a kill
// mid-write leaves the previous checkpoint intact.
const store = {
  ready(): boolean {
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      return true;
    } catch {
      return false;
    }
  },
  load(sessionId: string): Checkpoint {
    const file = join(STATE_DIR, sessionId + '.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { sessionId, messages: [] };
  },
  list(): SessionSummary[] {
    if (!existsSync(STATE_DIR)) return [];
    // Only finished checkpoints: an in-progress write is still a .tmp file.
    return readdirSync(STATE_DIR)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        try {
          const stat = statSync(join(STATE_DIR, file));
          return [{ sessionId: file.slice(0, -'.json'.length), lastActivity: stat.mtime.toISOString(), checkpointBytes: stat.size }];
        } catch {
          return []; // removed between the directory read and the stat
        }
      });
  },
  save(checkpoint: Checkpoint): void {
    mkdirSync(STATE_DIR, { recursive: true });
    const file = join(STATE_DIR, checkpoint.sessionId + '.json');
    const tmp = file + '.' + process.pid + '.tmp';
    writeFileSync(tmp, JSON.stringify(checkpoint));
    renameSync(tmp, file);
  },
};

// Replace this with the agent's work: call your model, run tools, return the reply. Keep it a pure function of the
// checkpoint so a resumed session continues from what was saved.
async function runTurn(checkpoint: Checkpoint, input: string): Promise<string> {
  // The caller has already appended this turn's user message, so the turn number is half the message count, rounded up.
  return 'received ' + input + ' (turn ' + Math.ceil(checkpoint.messages.length / 2) + ')';
}

let draining = false;
let inFlight = 0;
// Turns in flight per session, so GET /sessions can tell an active session from an idle one.
const activeTurns = new Map<string, number>();
const SESSION_LIST_LIMIT = 500;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  inFlight++;
  res.on('close', () => inFlight--);
  const url = new URL(req.url ?? '/', 'http://localhost');

  try {
    if (url.pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', service: 'assistant', draining });
    }

    if (url.pathname === '/ready') {
      const ok = !draining && (await store.ready());
      return sendJson(res, ok ? 200 : 503, { ready: ok, durability: DURABILITY });
    }

    // Session routing: the session id comes from the x-session-id header, so several instances of one agent can
    // share a Traefik route and each session still reaches its own checkpoint.
    if (url.pathname === '/turn' && req.method === 'POST') {
      if (draining) return sendJson(res, 503, { error: 'draining' });
      const sessionId = String(req.headers['x-session-id'] ?? '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
        return sendJson(res, 400, { error: 'x-session-id header is required (1-128 letters, digits, - or _)' });
      }
      const body = await readJson(req);
      const input = String(body.input ?? '');
      activeTurns.set(sessionId, (activeTurns.get(sessionId) ?? 0) + 1);
      try {
        const checkpoint = await store.load(sessionId);
        checkpoint.messages.push({ role: 'user', content: input, at: new Date().toISOString() });
        const reply = await runTurn(checkpoint, input);
        checkpoint.messages.push({ role: 'agent', content: reply, at: new Date().toISOString() });
        await store.save(checkpoint);
        return sendJson(res, 200, { sessionId, reply, turns: checkpoint.messages.length / 2 });
      } finally {
        const left = (activeTurns.get(sessionId) ?? 1) - 1;
        if (left > 0) activeTurns.set(sessionId, left);
        else activeTurns.delete(sessionId);
      }
    }

    if (url.pathname === '/session' && req.method === 'GET') {
      const sessionId = String(req.headers['x-session-id'] ?? '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) return sendJson(res, 400, { error: 'x-session-id header is required' });
      const checkpoint = await store.load(sessionId);
      return sendJson(res, 200, { sessionId, turns: checkpoint.messages.length / 2, messages: checkpoint.messages });
    }

    // Read-only list of the stored sessions, most recent first. status is 'active' while this instance runs a turn
    // for the session, otherwise 'idle'. total counts every stored session, also those past the limit.
    if (url.pathname === '/sessions' && req.method === 'GET') {
      const all = (await store.list()).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
      const sessions = all.slice(0, SESSION_LIST_LIMIT).map((s) => ({
        ...s,
        status: activeTurns.has(s.sessionId) ? 'active' : 'idle',
      }));
      return sendJson(res, 200, { sessions, total: all.length });
    }

    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    console.error('[agent] request failed:', error);
    return sendJson(res, 500, { error: 'internal_error' });
  }
});

// Bind beyond loopback: Traefik reaches the container over the Docker network.
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🤖 assistant agent on http://localhost:' + PORT + ' (durability: ' + DURABILITY + ')');
});

// Drain on SIGTERM (flisk down, hot reload, docker stop): stop taking turns, let in-flight turns finish, then exit 0.
// Checkpoints are written before a turn is answered, so a drained exit loses no acknowledged turn.
function shutdown(signal: string) {
  if (draining) return;
  draining = true;
  console.log('[agent] ' + signal + ' received, draining ' + inFlight + ' in-flight request(s)');
  server.close();
  const deadline = Date.now() + DRAIN_TIMEOUT_MS;
  const timer = setInterval(() => {
    if (inFlight === 0 || Date.now() > deadline) {
      clearInterval(timer);
      process.exit(0);
    }
  }, 100);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
