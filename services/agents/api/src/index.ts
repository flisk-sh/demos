// The agent chat api: one route, POST /chat, that forwards a message to the assistant's /turn.
// The session id travels as x-session-id, so each browser tab keeps its own conversation.
// Nothing is stored here: the assistant keeps the checkpoints.
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// The assistant has no host port: this name resolves on the stack's Docker network (the api's params set it).
const ASSISTANT_URL = process.env.ASSISTANT_URL || 'http://assistant:3000';
const SESSION = /^[A-Za-z0-9_-]{1,128}$/;

const app = new Hono();

// The demo web calls this api from another *.localhost origin during local runs.
app.use('*', cors({ origin: (origin) => (/^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin) ? origin : null) }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/chat', async (c) => {
  const { message, sessionId } = await c.req.json<{ message?: string; sessionId?: string }>().catch(() => ({}) as { message?: string; sessionId?: string });
  const text = message?.trim();
  if (!text) return c.json({ error: 'message is required' }, 400);
  if (!SESSION.test(sessionId ?? '')) return c.json({ error: 'sessionId is required' }, 400);

  try {
    const res = await fetch(`${ASSISTANT_URL}/turn`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': sessionId as string },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return c.json({ error: `assistant answered HTTP ${res.status}` }, 502);
    const body = (await res.json()) as { reply?: string };
    return c.json({ reply: String(body.reply ?? '') });
  } catch (err) {
    console.error('chat: assistant unreachable:', err);
    return c.json({ error: 'assistant unreachable' }, 502);
  }
});

export default { port: Number(process.env.PORT) || 3000, fetch: app.fetch };
