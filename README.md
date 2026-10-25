- Demo page: https://demo.flisk.sh/d/flisk_sh-dapp-25d0ef
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40160615455

# Flisk demo for @flisk_sh

web · api · api-migrator · jobs · chain · indexer

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Then open:

- web: http://app.dapp-demo.localhost/web/health
- api: http://api.dapp-demo.localhost/api/api/health

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
