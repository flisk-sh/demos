---
name: flisk-convert
description: Convert any existing app (Node, Python, Go, Rust, Bun, a static site, a Docker Compose or Procfile project, a monorepo) to run with Flisk, so `flisk up` starts it locally. Picks the right path (local processes, bring-your-own container, or `flisk import`), writes the `service.json` files with the CLI, and checks every URL. Use when the user says "convert this app to Flisk", "run this with Flisk", "add Flisk to this repo" or "move my Compose setup to Flisk". For a new app from a plain request, use flisk-build.
license: MIT
compatibility: Requires the flisk CLI and the app's own runtime. Docker and Tilt only for the container paths. Does not deploy.
metadata:
  author: flisk-sh
  version: "1.0"
---

# Convert an app to Flisk

Take an app that already exists and make `flisk up` start it. Change as little as possible: keep the app's code, its Compose file, Tiltfile and Helm charts. Flisk only adds `service.json` files and a `.flisk/` folder.

## 1. Look before you change

Work on a branch. Read the repo and list the parts that start together: websites, APIs, workers, agents, databases. For each part note the start command, the port it listens on, and an HTTP path that answers 200 when it is healthy. Run `git status` so you can see what Flisk adds later.

## 2. Pick one path per project

Do not mix runtimes in one project: `flisk up` refuses with `MIXED_RUNTIME`.

| The app | Path |
| --- | --- |
| Every part starts with one command and needs no database or Docker image | **A. Local processes**: a `command` in each `service.json` |
| A part needs Postgres, Redis or another image, one gateway URL, or the container it deploys | **B. Containers**: `flisk resource <name> --type bring-your-own` (a Dockerfile or an `--image`), the others as normal Flisk resources |
| It already has a `docker-compose.yml`, a `Procfile` or several Dockerfiles | **C. Import**: `flisk import <path>` reads them and writes the resources (needs `npx`), then check each result by hand |

Prefer A when it fits: nothing to install but Flisk and the app's runtime.

## 3. Convert

**A. Local processes.** In each part's folder write `service.json` with `schemaVersion: 1`, `appName` (kebab-case), `appType` (`frontend`, `backend`, `worker`, `mcp`, `agent`), `command`, `port` and `healthCheckPath`. Add `dependsOn` for start order and `env` for URLs between parts. The command runs from that folder and must read `PORT` from the environment. Then run `flisk up --dry-run`.

**B. Containers.** From the repo root run `flisk project --yes`. Wrap each existing part:

```bash
flisk resource <name> --type bring-your-own --stack <stack> --dockerfile ./Dockerfile --port <port> --health-path /health --yes
```

Use `--image <name>` instead of `--dockerfile` for a ready-made image, `--register-existing` for a folder that already has a `service.json`, and `--restart no` for a one-shot job. The container must listen on the port in `service.json`, bind to `0.0.0.0` and answer 200 on the health path. New parts that Flisk can scaffold use `flisk resource <name> --type backend|frontend|worker|agent|mcp`.

**C. Import.** Run `flisk import <path>`, read every generated `service.json`, and fix ports and health paths by hand.

## 4. Check and start

1. `flisk doctor`, then `flisk up --dry-run` (or `flisk up <stack> --dry-run`). Fix what they report.
2. `flisk up` (or `flisk up <stack>`). It prints the URLs.
3. `flisk status` and open each URL. A part is done only when its URL answers.
4. If something is red, read `flisk logs --service <name>` and use the flisk-troubleshoot skill.
5. Stop with `flisk down`.

## Guardrails

- Never delete or rewrite the app's Compose file, Tiltfile or charts. Flisk does not replace them.
- Do not hand-write Dockerfiles or Compose files for Flisk; use `flisk resource`. Hand-written `service.json` is fine only for path A.
- A database migration runs in its own `migrator` resource, not in the API's start script.
- Do not commit `.env` or secrets. Ask before changing an existing port, rename, or removing a start script.
- Report what was added (`git status`), the URLs, and what was not converted or not tested.
