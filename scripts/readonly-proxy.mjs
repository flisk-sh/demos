// Read-only front for the Tilt UI on a GitHub runner.
//
// Tilt's API can trigger and edit resources, so it must never be reachable from
// outside. This listens on 10351 and forwards only GET/HEAD and websocket
// upgrades (GET) to Tilt on 127.0.0.1:10350. Every other method gets 403.
// Host and Origin are rewritten to localhost:10350, the address Tilt expects.
//
// Tilt 0.37 also wants a session cookie (Tilt-Token, SameSite=Strict) on /api/websocket_token and the
// websocket. A browser inside the demo page's iframe, or any cross-site view, never sends it, and the
// live view then fails with "missing session token". So the proxy fetches the token from Tilt itself and
// sends it upstream on every request, and never passes Tilt's Set-Cookie on to the visitor. Everyone who
// can see the proxy can only read, so sharing one token does not widen what they can do.

import http from "node:http";
import { fileURLToPath } from "node:url";

const READ_ONLY = new Set(["GET", "HEAD"]);

export function createProxy({ tiltPort = 10350 } = {}) {
  const TILT = { host: "127.0.0.1", port: tiltPort };
  const TILT_ORIGIN = `http://localhost:${tiltPort}`;
  let token = null;

  // GET / on Tilt hands out the token as a cookie. Keep the value, ask again after a 403.
  function fetchToken() {
    return new Promise((resolve) => {
      const req = http.request({ ...TILT, path: "/", method: "GET", headers: { host: `localhost:${tiltPort}` } }, (res) => {
        const cookies = [].concat(res.headers["set-cookie"] ?? []);
        const m = cookies.map((c) => /^Tilt-Token=([^;]+)/.exec(c)).find(Boolean);
        res.resume();
        resolve(m ? m[1] : null);
      });
      req.on("error", () => resolve(null));
      req.end();
    });
  }
  const tokenNow = async (refresh = false) => {
    if (refresh || !token) token = await fetchToken();
    return token;
  };

  async function upstreamHeaders(headers, refresh = false) {
    const out = { ...headers, host: `localhost:${tiltPort}` };
    if (headers.origin) out.origin = TILT_ORIGIN;
    const t = await tokenNow(refresh);
    // The visitor's own cookies are dropped: Tilt only needs its token.
    if (t) out.cookie = `Tilt-Token=${t}`;
    else delete out.cookie;
    return out;
  }

  function forward(req, res, refresh = false) {
    upstreamHeaders(req.headers, refresh).then((headers) => {
      const up = http.request({ ...TILT, path: req.url, method: req.method, headers }, (upRes) => {
        if (upRes.statusCode === 403 && !refresh && req.method === "GET") {
          upRes.resume();
          forward(req, res, true); // the token changed (Tilt restarted): fetch it again, once
          return;
        }
        const out = { ...upRes.headers };
        delete out["set-cookie"]; // never hand Tilt's cookie to the visitor
        res.writeHead(upRes.statusCode, out);
        upRes.pipe(res);
      });
      up.on("error", () => {
        if (!res.headersSent) res.writeHead(502);
        res.end();
      });
      up.end();
    });
  }

  const server = http.createServer((req, res) => {
    if (!READ_ONLY.has(req.method)) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end("read-only\n");
      return;
    }
    forward(req, res);
  });

  // Websocket upgrades (Tilt's live view). Only GET may upgrade; the rest are refused.
  server.on("upgrade", async (req, socket, head) => {
    socket.on("error", () => socket.destroy());
    if (req.method !== "GET") {
      socket.end("HTTP/1.1 403 Forbidden\r\nconnection: close\r\ncontent-length: 0\r\n\r\n");
      return;
    }
    const up = http.request({ ...TILT, path: req.url, method: "GET", headers: await upstreamHeaders(req.headers) });
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

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createProxy();
  server.listen(10351, "127.0.0.1", () => {
    console.log("read-only Tilt proxy on 127.0.0.1:10351 -> http://localhost:10350");
  });
}
