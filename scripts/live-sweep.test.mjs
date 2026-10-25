import { test } from "node:test";
import assert from "node:assert/strict";
import { idOf, plan } from "./live-sweep.mjs";

const now = Date.parse("2026-10-25T12:00:00Z");
const at = (min) => new Date(now - min * 60_000).toISOString();
const run = (title, status, conclusion, min) => ({ title, status, conclusion, createdAt: at(min) });

test("both run names give the demo id", () => {
  assert.equal(idOf("live ottera21-dapp-402a9d"), "ottera21-dapp-402a9d");
  assert.equal(idOf("live demo/ottera21-dapp-402a9d"), "ottera21-dapp-402a9d");
  assert.equal(idOf("build ottera21"), null);
});

test("a demo whose last live run failed is started again", () => {
  const out = plan({ now, live: [], runs: [run("live a-app-1", "completed", "failure", 30)] });
  assert.deepEqual(out.retry, ["a-app-1"]);
});

test("a demo that ran fine, is running, or is live is left alone", () => {
  const out = plan({
    now,
    live: [{ id: "c-app-3", until: now + 60_000 }],
    runs: [
      run("live a-app-1", "completed", "success", 30),
      run("live demo/b-app-2", "in_progress", null, 5),
      run("live b-app-2", "completed", "failure", 60),
      run("live c-app-3", "completed", "failure", 90),
    ],
  });
  assert.deepEqual(out.retry, []);
});

test("at most 3 runs a day per demo, and at most 2 starts per pass", () => {
  const capped = plan({ now, live: [], runs: [1, 2, 3].map((m) => run("live a-app-1", "completed", "failure", m * 10)) });
  assert.deepEqual(capped.retry, []);
  const many = plan({ now, live: [], runs: ["x", "y", "z"].map((n, i) => run(`live ${n}-app-1`, "completed", "failure", i)) });
  assert.equal(many.retry.length, 2);
});

test("no start while every live slot is taken", () => {
  const runs = [run("live a-app-1", "completed", "failure", 30), ...[0, 1].map((i) => run(`live r${i}-app-1`, "in_progress", null, 5))];
  assert.deepEqual(plan({ now, live: [], runs, maxLive: 2 }).retry, []);
  assert.deepEqual(plan({ now, live: [], runs, maxLive: 3 }).retry, ["a-app-1"]);
});

test("runs older than a day do not count, so a demo can come back the next day", () => {
  const out = plan({ now, live: [], runs: [run("live a-app-1", "completed", "failure", 25 * 60)] });
  assert.deepEqual(out.retry, []);
});

test("live branches past their end (plus 10 minutes) or without a readable live.json are dropped", () => {
  const out = plan({
    now,
    runs: [],
    live: [
      { id: "ok-app-1", until: now + 60_000 },
      { id: "grace-app-2", until: now - 5 * 60_000 },
      { id: "over-app-3", until: now - 11 * 60_000 },
      { id: "broken-app-4", until: null },
    ],
  });
  assert.deepEqual(out.drop, ["over-app-3", "broken-app-4"]);
});
