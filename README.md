- Demo page: https://demo.flisk.sh/d/brookservers-agents-825d7d
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40295649519

# Flisk demo for @brookservers

web · api · api-migrator · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/brookservers-agents-825d7d

On your own machine, after `flisk up`:

- web: `http://app.agents-demo.localhost/web/health`
- api: `http://api.agents-demo.localhost/api/api/health`
- assistant: `http://api.agents-demo.localhost/api/assistant/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
