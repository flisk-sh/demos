- Demo page: https://demo.flisk.sh/d/my-app-6a1747
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/41466439900

# Flisk demo for @my

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/my-app-6a1747

On your own machine, after `flisk up`:

- web: `http://app.app-demo.localhost/web`
- api: `http://api.app-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
