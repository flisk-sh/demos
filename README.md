- Demo page: https://demo.flisk.sh/d/yourhandle-store-2bdcb2
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40209485622

# Flisk demo for @yourhandle

web · api · api-migrator

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
