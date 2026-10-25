- Demo page: https://demo.flisk.sh/d/bot-agents-5a7046
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40185061048

# Flisk demo for @bot

web · api · api-migrator · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Then open:

- web: http://app.agents-demo.localhost/web/health
- api: http://api.agents-demo.localhost/api/api/health
- assistant: http://api.agents-demo.localhost/api/assistant/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
