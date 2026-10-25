- Demo page: https://demo.flisk.sh/d/fixcheck-store-bb0816
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40225205839

# Flisk demo for @fixcheck

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/fixcheck-store-bb0816

On your own machine, after `flisk up`:

- web: `http://app.store-demo.localhost/web/health`
- api: `http://api.store-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
