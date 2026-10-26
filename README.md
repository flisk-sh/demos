- Demo page: https://demo.flisk.sh/d/s3-app-b79055
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40360710061

# Flisk demo for @s3

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/s3-app-b79055

On your own machine, after `flisk up`:

- web: `http://app.app-demo.localhost/web/health`
- api: `http://api.app-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
