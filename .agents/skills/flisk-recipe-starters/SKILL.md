---
name: flisk-recipe-starters
description: Start from a ready-made Flisk starter app instead of an empty project when the request matches one - restaurant (reservations, kitchen, menu, floor), SaaS (dashboard, billing, checkout), online store, AI agent stack (agent, MCP tools, database), user management (admin, portal, audit), or a small orders example. Clones it with `flisk project <template>` and starts it. Use with the flisk-build skill.
license: MIT
compatibility: Requires the flisk CLI, git, Docker and Tilt on the local machine. Does not deploy.
metadata:
  author: flisk-sh
  version: "1.0"
---

# Recipe: start from a starter app

A starter is a working multi-service app in the flisk-sh GitHub organisation. Starting from one is faster than building from an empty folder, and the user can change it afterwards. Use one when the request clearly matches a row below; use only one starter per project.

| The user asks for | Template | Stacks | What it ships |
| --- | --- | --- | --- |
| restaurant, reservations, kitchen, menu, bistro, diner | `restaurant` | `guest`, `kitchen`, `operations` | reservation app and API, floor app, kitchen API and worker, menu API (two websites) |
| SaaS, dashboard, billing, subscription, checkout | `saas` | `app`, `billing` | dashboard app and API, checkout app, billing API, a migrator per API |
| shop, store, storefront, ecommerce, catalogue | `ecommerce` | `store` | Vue storefront, catalog API and its migrator |
| AI agent stack, agent with tools and a database | `agent-stack` | `agents` | agent, its migrator, MCP tools server |
| user management, admin portal, accounts, audit | `user-management` | `admin`, `compliance`, `portal` | admin app and API, portal app and API, audit API and worker |
| the smallest example, orders | `example` | `shop` | orders app, API and worker |

`erp` also exists: it is a 107-service scale test, not an app. Do not use it for a user's request.

## Steps

```bash
flisk doctor
flisk project <template> --path <folder> --yes
cd <folder>
flisk project --yes          # see the note below
flisk up --dry-run           # check the services and URLs
flisk up <stack> --json &    # or omit <stack> to start every stack
flisk networks --raw
```

The starters ship `.flisk/project.json`, so `flisk up` and `flisk stacks` work right after cloning. Running `flisk project --yes` inside the clone is safe but not required.

Then change the starter to what the user asked for: rename things in the app code, add resources with `flisk resource ... --stack <stack>`, and follow the flisk-build skill to check every URL and report them.

## Guardrails

- Cloning needs network access to github.com. If it fails, fall back to the matching recipe (flisk-recipe-shop, flisk-recipe-saas, flisk-recipe-ai-agent) on an empty project.
- A starter with several stacks can be large on a small machine. Start only the stack the user needs first (`flisk up <stack>`), and ask before starting all of them.
- Tell the user which starter you used and that it came from github.com/flisk-sh.
