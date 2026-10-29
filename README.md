- Demo page: https://demo.flisk.sh/d/search-dapp-031d70
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40966764232

# Flisk demo for @search

web · api · api-migrator · chain · indexer

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/search-dapp-031d70

On your own machine, after `flisk up`:

- web: `http://app.dapp-demo.localhost/web`
- api: `http://api.dapp-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
