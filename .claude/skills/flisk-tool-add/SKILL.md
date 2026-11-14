---
name: flisk-tool-add
description: Add a tool to a Flisk project by its everyday name with `flisk tool add <tool> [name]` - React, Next.js, Angular, Tailwind, Node.js, FastAPI, Spring Boot, PostgreSQL, MySQL, MongoDB, RAG, embeddings, LLM APIs, Docker, GitHub Actions, Guidewire Jutro or PolicyCenter. Use when the user says "add React", "add a Postgres database", "add RAG" or names any tool or framework. Rejects cloud providers (AWS, Google Cloud, Azure) and Kubernetes. For a whole new app, use flisk-build.
license: MIT
compatibility: Requires the flisk CLI. Does not deploy and never creates cloud resources.
metadata:
  author: flisk-sh
  version: "1.0"
---

# Flisk add

When the user names a tool, add it with `flisk tool add`, not by picking `flisk resource` flags yourself. `flisk tool add` runs the right `flisk resource` command, or says why it cannot.

## Workflow

1. See what exists: `flisk tool add` (no tool) lists every tool and its outcome. `flisk tool add --json` gives the same as data.
2. Add the tool: `flisk tool add <tool> [name] [--stack <stack>]`. Pass a name when the default (`web`, `api`, `db`…) is already taken, and `--stack` when the project has more than one stack.
3. Read the outcome and act on it:
   - **adds a resource**: done. Read the printed `Next:` line, then start it with `flisk up` (see flisk-up).
   - **built in** (Docker): tell the user; change nothing.
   - **manual steps** (Angular, Tailwind, Spring Boot, GitHub Actions, Guidewire Jutro, PolicyCenter): show the steps to the user. Carry out the open-source ones (Angular, Tailwind, Spring Boot, GitHub Actions) only if the user asks. Never fetch or fake Guidewire software: it is licensed and the user must supply it.
   - **rejected** (exit 1: AWS, Google Cloud, Azure, Kubernetes): stop. Tell the user Flisk runs everything on their own computer and never creates cloud resources, and offer the local alternatives the command printed. Do not work around the rejection with another command, a script or a cloud CLI.
4. Check it: `flisk config verify` and `flisk resources`.

## Examples

```bash
flisk tool add react
flisk tool add fastapi orders --stack shop
flisk tool add postgresql
flisk tool add rag && flisk tool add embeddings && flisk tool add llm-api   # a local RAG stack
flisk tool add nextjs --dry-run
```

## Guardrails

- One `flisk tool add` per tool the user named; do not add tools they did not ask for.
- Preview with `--dry-run` when the user is unsure.
- Full guide: [docs/add-a-tool.md](https://github.com/flisk-sh/flisk/blob/main/docs/add-a-tool.md).
