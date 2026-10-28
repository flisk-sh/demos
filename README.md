- Demo page: https://demo.flisk.sh/d/data-app-6c1d24
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40661683939

# Flisk demo for @data

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/data-app-6c1d24

On your own machine, after `flisk up`:

- web: `http://app.flisk-auth-queue-email-example.localhost/reports`
- auth-emulator: `http://api.flisk-auth-queue-email-example.localhost/api/auth-emulator/health`
- reports-api: `http://api.flisk-auth-queue-email-example.localhost/api/reports/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
