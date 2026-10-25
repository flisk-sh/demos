import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createProxy } from "./readonly-proxy.mjs";

// A fake Tilt 0.37: GET / hands out a Tilt-Token cookie, /api/websocket_token needs it.
function fakeTilt() {
  const state = { token: "tok-1", seen: [] };
  const server = http.createServer((req, res) => {
    state.seen.push({ method: req.method, url: req.url, host: req.headers.host, cookie: req.headers.cookie });
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html", "set-cookie": `Tilt-Token=${state.token}; Path=/; SameSite=Strict` });
      res.end("<html>tilt</html>");
      return;
    }
    if (req.url === "/api/websocket_token") {
      if (!req.headers.cookie?.includes(`Tilt-Token=${state.token}`)) {
        res.writeHead(403, { "content-type": "text/plain" });
        res.end("missing session token\n");
        return;
      }
      res.writeHead(200);
      res.end("ws-token");
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return { server, state };
}

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const get = (port, path, opts = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method: opts.method ?? "GET", headers: opts.headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });

async function setup() {
  const { server: tilt, state } = fakeTilt();
  const tiltPort = await listen(tilt);
  const proxy = createProxy({ tiltPort });
  const port = await listen(proxy);
  return { state, port, close: () => { tilt.close(); proxy.close(); } };
}

test("a visitor with no cookie, like a cross-site iframe, still gets the websocket token", async () => {
  const { port, close } = await setup();
  try {
    const res = await get(port, "/api/websocket_token", { headers: { referer: "https://x.trycloudflare.com/" } });
    assert.equal(res.status, 200);
    assert.equal(res.body, "ws-token");
  } finally { close(); }
});

test("Tilt's cookie is never passed on to the visitor, and the visitor's cookies never reach Tilt", async () => {
  const { port, state, close } = await setup();
  try {
    const page = await get(port, "/", { headers: { cookie: "session=secret" } });
    assert.equal(page.status, 200);
    assert.equal(page.headers["set-cookie"], undefined);
    assert.ok(state.seen.every((r) => !String(r.cookie).includes("secret")));
    assert.ok(state.seen.every((r) => r.host.startsWith("localhost:")), "Host is rewritten to localhost");
  } finally { close(); }
});

test("when Tilt restarts and its token changes, the proxy fetches the new one", async () => {
  const { port, state, close } = await setup();
  try {
    assert.equal((await get(port, "/api/websocket_token")).status, 200);
    state.token = "tok-2";
    assert.equal((await get(port, "/api/websocket_token")).status, 200);
  } finally { close(); }
});

test("anything but GET and HEAD is refused", async () => {
  const { port, state, close } = await setup();
  try {
    for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
      const res = await get(port, "/api/trigger", { method });
      assert.equal(res.status, 403, method);
      assert.equal(res.body, "read-only\n");
    }
    assert.equal(state.seen.length, 0, "nothing was forwarded");
  } finally { close(); }
});
