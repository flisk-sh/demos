// Same-origin front for the demo app on a GitHub runner. The app tunnel points
// here, so the page and its api share one origin:
//
//   /api/...  -> Traefik, Host api.<project>.localhost, path /api/api/...
//   anything  -> Traefik, Host app.<project>.localhost, path unchanged (the web is under /web/)
//
// /api/api is where Flisk routes the api on the host, so /api/health reaches its /health.
// Only GET, HEAD, POST and OPTIONS pass, and websocket upgrades are GET only. Tilt is
// never reached from here: readonly-proxy.mjs is the only way to see it.

import http from "node:http";

const LISTEN_PORT = Number(process.env.PROXY_PORT || 10352);
const TRAEFIK = { host: "127.0.0.1", port: Number(process.env.TRAEFIK_PORT) };
const APP_HOST = process.env.APP_HOST;
const ALLOWED = new Set(["GET", "HEAD", "POST", "OPTIONS"]);

if (!APP_HOST || !/^app\.[a-z0-9.-]+\.localhost$/.test(APP_HOST)) throw new Error(`bad APP_HOST: ${APP_HOST}`);
if (!TRAEFIK.port) throw new Error("TRAEFIK_PORT is required");
const API_HOST = APP_HOST.replace(/^app\./, "api.");

// Where a request from the tunnel goes: which Host Traefik routes on, and the path it gets.
function route(url) {
  if (/^\/api(\/|\?|$)/.test(url)) return { host: API_HOST, path: url.replace(/^\/api(?=\/|\?|$)/, "/api/api") };
  return { host: APP_HOST, path: url };
}

const server = http.createServer((req, res) => {
  if (!ALLOWED.has(req.method)) {
    res.writeHead(405, { allow: [...ALLOWED].join(", "), "content-type": "text/plain" });
    res.end("method not allowed\n");
    return;
  }
  const { host, path } = route(req.url);
  const up = http.request({ ...TRAEFIK, path, method: req.method, headers: { ...req.headers, host } }, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  up.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(up);
});

// Websocket upgrades (the dev server's live reload). GET only, like the read-only proxy.
server.on("upgrade", (req, socket, head) => {
  socket.on("error", () => socket.destroy());
  if (req.method !== "GET") {
    socket.end("HTTP/1.1 405 Method Not Allowed\r\nconnection: close\r\ncontent-length: 0\r\n\r\n");
    return;
  }
  const { host, path } = route(req.url);
  const up = http.request({ ...TRAEFIK, path, method: "GET", headers: { ...req.headers, host } });
  up.on("upgrade", (upRes, upSocket, upHead) => {
    upSocket.on("error", () => socket.destroy());
    let raw = "";
    for (let i = 0; i < upRes.rawHeaders.length; i += 2) raw += `${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}\r\n`;
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${raw}\r\n`);
    if (upHead.length) socket.write(upHead);
    if (head.length) upSocket.write(head);
    upSocket.pipe(socket);
    socket.pipe(upSocket);
  });
  up.on("response", (upRes) => {
    socket.end(`HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`);
    upRes.resume();
  });
  up.on("error", () => socket.destroy());
  up.end();
});

server.listen(LISTEN_PORT, "127.0.0.1", () => {
  console.log(`app proxy on 127.0.0.1:${LISTEN_PORT} -> Traefik 127.0.0.1:${TRAEFIK.port} (${APP_HOST}, ${API_HOST} at /api/api)`);
});
