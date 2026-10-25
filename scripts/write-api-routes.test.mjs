import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("the api routes come from the dry run's api URLs, without the /health suffix, and skip frontends", () => {
  const dir = mkdtempSync(join(tmpdir(), "routes-"));
  const dry = join(dir, "dry.txt");
  const out = join(dir, "routes.json");
  writeFileSync(dry, "- web: http://app.r-demo.localhost:8080/web/health\n  - reservation-api: http://api.r-demo.localhost/api/reservation-api/health\n  - api: http://api.r-demo.localhost/api/api/health\n");
  execFileSync("python3", ["scripts/write-api-routes.py", dry, out]);
  const routes = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(routes["reservation-api"], { host: "api.r-demo.localhost", base: "/api/reservation-api" });
  assert.deepEqual(routes.api, { host: "api.r-demo.localhost", base: "/api/api" });
  assert.equal(routes.web, undefined, "frontends are not apis");
});
