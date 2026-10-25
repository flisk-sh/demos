- Demo page: https://demo.flisk.sh/d/vibatron-app-85a94f
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40158139294

# Flisk demo for @Vibatron

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Then open:

- web: http://app.app-demo.localhost/web/health
- api: http://api.app-demo.localhost/api/api/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
