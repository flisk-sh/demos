#!/usr/bin/env python3
# Writes routes.json for app-proxy.mjs from `flisk up --dry-run` output: every api the stack lists, with its own
# host and the path base in front of its routes (the local URL without its /health suffix).
#   write-api-routes.py <dry-run.txt> <routes.json>
import json
import re
import sys

LINE = re.compile(r"^\s*-?\s*([a-z0-9-]{1,40}):\s*http://(api\.[a-z0-9.-]+\.localhost)(?::\d+)?(/\S*)?\s*$", re.I)

routes = {}
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        m = LINE.match(line)
        if not m:
            continue
        name, host, path = m.group(1), m.group(2), (m.group(3) or "")
        base = re.sub(r"/health/?$", "", path)
        if not re.fullmatch(r"/[a-z0-9/_-]*", base or "/"):
            continue
        routes[name] = {"host": host, "base": base or "/"}

with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump(routes, f, indent=2)
print("api routes:", ", ".join(f"{n} -> {r['base']}" for n, r in routes.items()) or "none")
