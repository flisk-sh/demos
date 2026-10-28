---
name: flisk-resource
description: Create a new Flisk service with `flisk resource <name> --type agent|backend|worker|mcp`, or register an existing one. Use when the user asks to add a service, agent, MCP tools server, worker, or backend to a Flisk project.
license: MIT
compatibility: Requires the flisk CLI. Does not deploy.
metadata:
  author: flisk-sh
  version: "1.0"
---

# Flisk resource

Create services with the CLI so each one gets a valid `service.json` and the right runtime contract. Do not hand-write container manifests.

## Workflow

1. Choose the type: `agent` (its own `/health`, `/ready`, and `x-session-id` routing), `backend` (HTTP API), `worker` (background jobs), or `mcp` (tools server).
2. Create it: `flisk resource <name> --type <type> --stack <stack>`. Use `--language <id>` only when the user names a language (`bun` is the default).
3. For an existing service, use `--register-existing` instead of generating templates.
4. Check the result with `flisk doctor` and read the new `service.json`.
5. Start it with `flisk up <stack>` (see the flisk-up skill).

## Guardrails

- Use kebab-case names.
- A database migration belongs in its own `migrator` resource, not in an API start script.
- Ask before creating resources in a stack the user did not name.
