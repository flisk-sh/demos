---
name: flisk-status
description: Report the state of Flisk stacks and resources with `flisk status --json`, and inspect agent sessions with `flisk agent sessions`. Use when the user asks what is running, which URLs are healthy, or why a service is not responding.
license: MIT
compatibility: Requires the flisk CLI. Does not deploy.
metadata:
  author: flisk-sh
  version: "1.0"
---

# Flisk status

Read the state from the CLI rather than guessing from Docker output.

## Workflow

1. Run `flisk status --json` from the project root. Use `--resources` to list every discovered resource, or `--tilt` for Tilt resource state.
2. Summarize per stack: running, healthy, unhealthy, or stopped, with each service's URL.
3. For an agent resource, inspect sessions with `flisk agent sessions <resource> --session-id <id>`.
4. If a service is unhealthy, run `flisk networks` to confirm its routed URL, then switch to the flisk-troubleshoot skill.

## Guardrails

- Report only what the output shows. Say so when a field is missing.
- Do not stop containers by name pattern. Identify the stack first.
