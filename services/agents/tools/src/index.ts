import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// A new McpServer per request keeps the endpoint stateless, so there is no session to lose when the container restarts.
function buildServer() {
  const server = new McpServer({ name: 'tools', version: '1.0.0' });

  // Add your tools, resources and prompts here. This one is a placeholder you can delete.
  server.registerTool(
    'echo',
    { description: 'Echo a message back', inputSchema: { message: z.string() } },
    async ({ message }) => ({ content: [{ type: 'text', text: message }] })
  );

  return server;
}

async function readBody(req: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

const httpServer = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];

  // Health check endpoint (required by TILT_RESOURCE_DEFAULTS.star)
  if (path === '/health') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', service: 'tools' }));
    return;
  }

  // MCP over Streamable HTTP. Clients POST JSON-RPC here.
  if (path === '/mcp') {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('allow', 'POST');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }));
      return;
    }

    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, await readBody(req));
    return;
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: 'not_found' }));
});

const port = Number(process.env.PORT || 3000);

// Bind beyond loopback: Traefik reaches the container over the Docker network.
httpServer.listen(port, '0.0.0.0', () => {
  console.log('\n🚀 tools MCP server on http://localhost:' + port + '/mcp');
  console.log('📊 Health check: http://localhost:' + port + '/health\n');
});
