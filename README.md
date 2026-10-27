- Demo page: https://demo.flisk.sh/d/rauchg-agents-edd5df
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40599671951

# Flisk demo for @rauchg

web · api · api-migrator · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/rauchg-agents-edd5df

On your own machine, after `flisk up`:

- web: `http://app.agents-demo.localhost/web`
- api: `http://api.agents-demo.localhost/api/api/health`
- assistant: `http://api.agents-demo.localhost/api/assistant/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
