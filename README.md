- Demo page: https://demo.flisk.sh/d/flisk_sh-store-248f79
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40160615674

# Flisk demo for @flisk_sh

web · api · api-migrator · jobs

```bash
npm install -g @flisk-sh/flisk
cp .env.example .env   # add your keys
flisk doctor
flisk up
```

Then open:

- web: http://app.store-demo.localhost/web/health
- api: http://api.store-demo.localhost/api/api/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
