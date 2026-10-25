import { test } from "node:test";
import assert from "node:assert/strict";
import { route, parseRoutes } from "./app-routes.mjs";

const APP = "app.restaurant-demo.localhost";
const routes = { "reservation-api": { host: "api.restaurant-demo.localhost", base: "/api/reservation-api" }, "menu-api": { host: "api.restaurant-demo.localhost", base: "/api/menu-api" } };

test("the Board's /api keeps going to /api/api on the api host", () => {
  assert.deepEqual(route("/api/items", APP), { host: "api.restaurant-demo.localhost", path: "/api/api/items" });
});

test("a named api is reached under its own base, with the rest of the path", () => {
  assert.deepEqual(route("/reservation-api/api/v1/reservations", APP, routes), { host: "api.restaurant-demo.localhost", path: "/api/reservation-api/api/v1/reservations" });
  assert.deepEqual(route("/menu-api/api/operations-management?x=1", APP, routes), { host: "api.restaurant-demo.localhost", path: "/api/menu-api/api/operations-management?x=1" });
});

test("a frontend path stays on the app host, unchanged", () => {
  assert.deepEqual(route("/reservation-app/", APP, routes), { host: APP, path: "/reservation-app/" });
  assert.deepEqual(route("/", APP, routes), { host: APP, path: "/" });
});

test("an unknown name is not an api: it stays on the app host", () => {
  assert.deepEqual(route("/nope/x", APP, routes), { host: APP, path: "/nope/x" });
});

test("the routes file keeps only well-formed entries", () => {
  const parsed = parseRoutes(JSON.stringify({ "menu-api": routes["menu-api"], "../evil": routes["menu-api"], "x": { host: "evil.example", base: "/api/x" }, "y": { host: "api.a.localhost", base: "/api/../x" } }));
  assert.deepEqual(Object.keys(parsed), ["menu-api"]);
});
