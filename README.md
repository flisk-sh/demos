- Demo page: https://demo.flisk.sh/d/brookservers-store-8b0206
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40610878581

# Flisk demo for @brookservers

web · api · api-migrator · jobs · tools · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/brookservers-store-8b0206

On your own machine, after `flisk up`:

- web: `http://app.store-demo.localhost/web`
- api: `http://api.store-demo.localhost/api/api/health`
- assistant: `http://api.store-demo.localhost/api/assistant/health`
- tools: `http://api.store-demo.localhost/api/tools/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
