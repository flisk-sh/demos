- Demo page: https://demo.flisk.sh/d/brookservers-app-b7e5d2
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40157061921

# Flisk demo for @brookservers

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
