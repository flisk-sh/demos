import { useEffect, useRef, useState, type FormEvent } from 'react';
import plan from './demo-plan.json';
import './demo-chat.css';
import { API_BASE } from './demo-api';

type Message = { role: 'user' | 'assistant'; text: string };

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
// One conversation per tab: the assistant keeps its checkpoint under this id.
const newSession = () => (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

async function ask(sessionId: string, text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, message: text }),
  });
  const body = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || typeof body.reply !== 'string') throw new Error(body.error ?? `chat failed: HTTP ${res.status}`);
  return body.reply;
}

function App() {
  useEffect(() => {
    document.title = `${plan.handle}'s assistant`;
  }, []);

  const [sessionId] = useState(newSession);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState('');
  const log = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, pending]);

  async function send(text: string) {
    setError('');
    setFailed('');
    setPending(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    try {
      const reply = await ask(sessionId, text);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(message(err));
      setFailed(text);
    } finally {
      setPending(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft('');
    void send(text);
  }

  return (
    <main className="chat">
      <header>
        <p className="eyebrow">Flisk agent demo</p>
        <h1>{plan.handle}'s assistant</h1>
        <p className="summary">{plan.summary}</p>
      </header>

      <section className="thread" ref={log} aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && !pending && (
          <div className="empty">
            <h2>Ask the assistant something</h2>
            <p>Each reply comes from the assistant service in this stack. Your conversation stays on this page until you reload it.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`} data-role={m.role}>
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="bubble assistant typing" role="status">
            Thinking…
          </div>
        )}
      </section>

      {error && (
        <div className="error" role="alert">
          <span>Could not get a reply: {error}</span>
          <button type="button" onClick={() => void send(failed)} disabled={pending || !failed}>
            Try again
          </button>
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <input
          type="text"
          value={draft}
          placeholder="Type a message"
          aria-label="Message"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={pending || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="hint">Edit services/{plan.stack}/web/src/App.tsx and save, it reloads.</p>
    </main>
  );
}

export default App;
