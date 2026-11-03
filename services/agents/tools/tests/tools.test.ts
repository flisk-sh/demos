import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { httpServer } from '../src/index';

let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  httpServer.closeAllConnections();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

let nextId = 1;

// Sends one JSON-RPC request to /mcp and returns its result. The transport answers with a server-sent event whose data line
// is the JSON-RPC response.
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(baseUrl + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  expect(res.status).toBe(200);
  const text = await res.text();
  const data = text.split('\n').find((line) => line.startsWith('data: '));
  const message = JSON.parse(data ? data.slice('data: '.length) : text);
  expect(message.error).toBeUndefined();
  return message.result;
}

describe('tools MCP protocol', () => {
  it('answers initialize with its name and the tools and prompts capabilities', async () => {
    const result = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'protocol-test', version: '1.0.0' },
    });
    expect(result.serverInfo.name).toBe('tools');
    expect(result.serverInfo.icons).toEqual([{ src: '/icon-512.png', mimeType: 'image/png', sizes: ['512x512'] }]);
    expect(result.capabilities.tools).toBeDefined();
    expect(result.capabilities.prompts).toBeDefined();
  });

  it('lists the echo tool with its annotations', async () => {
    const { tools } = await rpc('tools/list');
    const echo = tools.find((tool: { name: string }) => tool.name === 'echo');
    expect(echo).toBeDefined();
    expect(echo.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('lists the echo_message prompt', async () => {
    const { prompts } = await rpc('prompts/list');
    expect(prompts.map((prompt: { name: string }) => prompt.name)).toContain('echo_message');
  });

  it('calls the echo tool', async () => {
    const result = await rpc('tools/call', { name: 'echo', arguments: { message: 'hello' } });
    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([{ type: 'text', text: 'hello' }]);
  });

  it('answers a body that is not JSON with a parse error and keeps serving', async () => {
    const res = await fetch(baseUrl + '/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32700);
    expect((await fetch(baseUrl + '/health')).status).toBe(200);
  });

  it('answers a client that accepts only JSON with a JSON response', async () => {
    const res = await fetch(baseUrl + '/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method: 'tools/list', params: {} }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const message = await res.json();
    expect(message.result.tools.map((tool: { name: string }) => tool.name)).toContain('echo');
  });

  it('answers GET /mcp with 405 and an Allow header', async () => {
    const res = await fetch(baseUrl + '/mcp');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('serves its icon as a PNG', async () => {
    const res = await fetch(baseUrl + '/icon-512.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
