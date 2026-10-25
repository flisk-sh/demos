// Read-only front for the Tilt UI on a GitHub runner.
//
// Tilt's API can trigger and edit resources, so it must never be reachable from
// outside. This listens on 10351 and forwards only GET/HEAD and websocket
// upgrades (GET) to Tilt on 127.0.0.1:10350. Every other method gets 403.
// Host and Origin are rewritten to localhost:10350, the address Tilt expects.

import http from "node:http";

const LISTEN_PORT = 10351;
const TILT = { host: "127.0.0.1", port: 10350 };
const TILT_ORIGIN = `http://localhost:${TILT.port}`;
const READ_ONLY = new Set(["GET", "HEAD"]);

function upstreamHeaders(headers) {
  const out = { ...headers, host: `localhost:${TILT.port}` };
  if (headers.origin) out.origin = TILT_ORIGIN;
  return out;
}

const server = http.createServer((req, res) => {
  if (!READ_ONLY.has(req.method)) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("read-only\n");
    return;
  }
  const up = http.request({ ...TILT, path: req.url, method: req.method, headers: upstreamHeaders(req.headers) }, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  up.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(up);
});

// Websocket upgrades (Tilt's live view). Only GET may upgrade; the rest are refused.
server.on("upgrade", (req, socket, head) => {
  socket.on("error", () => socket.destroy());
  if (req.method !== "GET") {
    socket.end("HTTP/1.1 403 Forbidden\r\nconnection: close\r\ncontent-length: 0\r\n\r\n");
    return;
  }
  const up = http.request({ ...TILT, path: req.url, method: "GET", headers: upstreamHeaders(req.headers) });
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
  console.log(`read-only Tilt proxy on 127.0.0.1:${LISTEN_PORT} -> ${TILT_ORIGIN}`);
});
