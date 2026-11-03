import { realpathSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// The icon MCP directories and clients show next to this server's name. Replace it with your own 512 x 512 PNG.
const ICON_512_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAABlBMVEUWo0r///+zeCNEAAAFKklEQVR42u3c0XEYORDEUE7+SSsCfam4IomHCDgNeFW+s70WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgB7zK7ZJapcC9TLgXgXcq4B8EZAvAvY1wL4G2NcA+xqgXwLsa4B+CbCvAfolQL8E6JcA/RKgXwL0S4B+CdAvAf4VQL8E6JcA/wqgXwL8K4B+CfCvAPolwL8C+FdAXL8E+FdA3b8C4volwL8C6v4VUPevgLp/BdT9KyCuXwL8K6DuXwF1/wqo+1dA3b8C6v4V8L/+z30D/weMroAX/T/wJP4/H1oB1/t//XX8f7GvAm70X3ylAHbuKoBr/Htr2b/3pv17ctq/V6f9e3jav7enA/D6tH8HpP27gX9XZANwR9q/U/h3TNa/e9oBOIh/J2X9u6odgLP4dxj/TksG4Dj+nce/A5sBuJB/N3YDcCT/zuTfoc0AXMq/W7sBOJZ/53YDcC//Lu4G4GQfADf7ADiaf2cHl3A3/y4XgMut4PbgCI7n3/kWcH50Afe73wLOt4DrbeB4G9SOX0sB43QFuFwADleAuw2RunstBaT/d7gAXpmC//gWAmhvwX98DQEIgP/wHD4A8T34jw8igPYg/McnEYAABCAA/qub+ADER+E/vooABCCA8Cr8x3cRgAAEIAD+s8MIoD2MnwDxZfiPTyMAAQhAAAKoTsN/fBwBCEAAAhCAAAQgAP576/gAxOcRgAAEIAABCID/5j4CEIAABCAAAQhAAALo7eN3gfGBBCAA/ssLCUAAAhCAAAQgAAEIQAACEIAABCAAAQhAAAIQgAAEIAABCEAAAhCAAAQgAAEIQAACEIAABCAAAQjAHwvnXwACqP3VIAH4u4ECEIAABCAAAQhAAALwz8TxLwABCEAAAhDAFP65cAE8tY5PQHwcAQhAAAIQgAAEEB1HAfFpBCAAAQhAAAJQQHQZAcSHEYAAFFDeRQACEEB6FwXEVxGAAAQgAAV0RxFAfBOfgPgkAhCAANKTKCA+iAAEoID0HgKIz+ETEF9DAPU1FBDfQgACUEB6CgHEl/AJiA8hgPoQCojPIID6DAqIjzAKaG8ggPoGCogvIID6Au6P/woYPwIFIAA/A/13kOxvgyY8wgggvQL/AhBAeAf+/zzEOFsBjk4HMG72CXCyT4CLFeDeagDjXAU4Nh3AuFUBLk0HMA5VgDMV4MhwAONGBbgwHcA4UAHOU4DjwgGcu9LDp5mJf0Pxf85S46p6AeMkBTgoHcC4p17AOEYBTmkXMO6IB/C/071xhe34v3u9cUC9gPH6eABfj3jz218tYDy8XsB4db2A8eR6AeO99QL2bXrTW9sFTPqhAtgw7R2vVMCedc9/oQL2LXz26xSwdeZjH6aA7WMf+CQFfDT5UY9RwHfbn/AGBVRgvF0A3+0C2G4XwHW7AKbbBfDcLoDldAIMtwvgt10Au+0CuG0XwGy7AF7TCXDaLoDRdgF8phPgsl0Ak+0CeEwnwGG7AAbTCbDXLoC7dAK8tQtgLZ0AY+kE2GoXwFU6AZ7SCXCUToCfdALcpBPgJZ0AJ+kE+EgnwEW5ARbSCTBQbsD26QTsXm7A4uUGbF1uwMrlBuwbjsCu4Qjs2a3Ait0KbJfNwF7JFGwDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABPkB9z6yDZK057cAAAAASUVORK5CYII=',
  'base64'
);

// A new McpServer per request keeps the endpoint stateless, so there is no session to lose when the container restarts.
function buildServer() {
  const server = new McpServer({
    name: 'tools',
    version: '1.0.0',
    // Clients and directories fetch this icon from the server's own origin.
    icons: [{ src: '/icon-512.png', mimeType: 'image/png', sizes: ['512x512'] }],
  });

  // Add your tools, resources and prompts here. These two are placeholders you can delete.
  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description: 'Echo a message back',
      inputSchema: { message: z.string() },
      // Hints for clients: this tool only reads, deletes nothing, answers the same input the same way and reaches nothing outside this server.
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ message }) => ({ content: [{ type: 'text', text: message }] })
  );

  server.registerPrompt(
    'echo_message',
    {
      title: 'Echo a message',
      description: 'Ask the assistant to send a message through the echo tool',
      argsSchema: { message: z.string() },
    },
    ({ message }) => ({
      messages: [
        { role: 'user', content: { type: 'text', text: 'Call the echo tool with this message: ' + message } },
      ],
    })
  );

  return server;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

export const httpServer = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];

  // Health check endpoint (required by TILT_RESOURCE_DEFAULTS.star)
  if (path === '/health') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', service: 'tools' }));
    return;
  }

  if (path === '/icon-512.png') {
    res.setHeader('content-type', 'image/png');
    res.setHeader('cache-control', 'public, max-age=86400');
    res.end(ICON_512_PNG);
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

    // A body that is not JSON gets a JSON-RPC parse error. Throwing here would end the process, since nothing awaits
    // this handler.
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
      return;
    }

    // A client that accepts only application/json gets a plain JSON response. The SDK refuses with 406 unless Accept also
    // lists text/event-stream, so add it to both header copies (the transport reads rawHeaders) and turn SSE off.
    const accept = String(req.headers.accept ?? '');
    const jsonOnly = accept.includes('application/json') && !accept.includes('text/event-stream');
    if (jsonOnly) {
      const widened = accept + ', text/event-stream';
      req.headers.accept = widened;
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (req.rawHeaders[i].toLowerCase() === 'accept') req.rawHeaders[i + 1] = widened;
      }
    }

    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: jsonOnly });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: 'not_found' }));
});

const envPort = Number(process.env.PORT);
const port = Number.isInteger(envPort) && envPort >= 1 && envPort <= 65535 ? envPort : 3000;

// Listen only when this file is the entry point (node dist/index.js, tsx src/index.ts). The protocol test imports it
// and listens on a port of its own.
function isEntryPoint() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  // Bind beyond loopback: Traefik reaches the container over the Docker network.
  httpServer.listen(port, '0.0.0.0', () => {
    console.log('\n🚀 tools MCP server on http://localhost:' + port + '/mcp');
    console.log('📊 Health check: http://localhost:' + port + '/health\n');
  });
} else {
  console.log('tools: imported as a module, not listening (run this file directly to start the server)');
}
