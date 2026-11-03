- Demo page: https://demo.flisk.sh/d/hulkito510-app-31ca2e
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/41616471843

# Flisk demo for @Hulkito510

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/hulkito510-app-31ca2e

On your own machine, after `flisk up`:

- web: `http://app.app-demo.localhost/web`
- api: `http://api.app-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
