- Demo page: https://demo.flisk.sh/d/flisk_sh-store-22dc2b
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40160615278

# Flisk demo for @flisk_sh

web · api · api-migrator · jobs

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Then open:

- web: http://app.store-demo.localhost/web/health
- api: http://api.store-demo.localhost/api/api/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
