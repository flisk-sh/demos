- Demo page: https://demo.flisk.sh/d/flisk_sh-app-0bb598
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40150872937

# Flisk demo for @flisk_sh

web · api · api-migrator · jobs

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Then open:

- web: http://app.app-demo.localhost/web/health
- api: http://api.app-demo.localhost/api/api/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
