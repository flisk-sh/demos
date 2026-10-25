// Where a request from the app tunnel goes. Pure: no network, so it is tested in app-routes.test.mjs.
//
// - /api/...           -> the Board's api: Host api.<project>.localhost, path /api/api/...
// - /<service>/...     -> another api of the stack, when routes.json names it: its own Host and path base
// - anything else      -> Host app.<project>.localhost, path unchanged (frontends live under /<name>/)
//
// routes.json is written by the live run from the stack's local URLs, for example
//   { "reservation-api": { "host": "api.restaurant-demo.localhost", "base": "/api/reservation-api" } }
// so a request to /reservation-api/api/v1/reservations reaches /api/reservation-api/api/v1/reservations on that api.

const NAME = /^[a-z0-9-]{1,40}$/;

export function route(url, appHost, routes = {}) {
  const apiHost = appHost.replace(/^app\./, "api.");
  const named = /^\/([a-z0-9-]{1,40})(\/[^?]*)?(\?.*)?$/.exec(url);
  if (named && NAME.test(named[1]) && routes[named[1]]) {
    const r = routes[named[1]];
    const rest = (named[2] ?? "/") + (named[3] ?? "");
    return { host: r.host, path: `${r.base}${rest}` };
  }
  if (/^\/api(\/|\?|$)/.test(url)) return { host: apiHost, path: url.replace(/^\/api(?=\/|\?|$)/, "/api/api") };
  return { host: appHost, path: url };
}

// The routes file from the live run: only well-formed entries are kept.
export function parseRoutes(text) {
  const out = {};
  for (const [name, r] of Object.entries(JSON.parse(text))) {
    if (!NAME.test(name)) continue;
    if (!/^api\.[a-z0-9.-]+\.localhost$/.test(r?.host ?? "")) continue;
    if (!/^\/[a-z0-9/_-]*$/.test(r?.base ?? "")) continue;
    out[name] = { host: r.host, base: r.base };
  }
  return out;
}
