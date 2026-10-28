- Demo page: https://demo.flisk.sh/d/yourhandle-store-635bea
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40618738450

# Flisk demo for @yourhandle

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
cp .env.example .env   # add your keys
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/yourhandle-store-635bea

On your own machine, after `flisk up`:

- web: `http://app.store-demo.localhost/web`
- api: `http://api.store-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
