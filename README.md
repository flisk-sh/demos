- Demo page: https://demo.flisk.si/d/userfiles-app-bb450c
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/43308341405

# Flisk demo for @userfiles

web · api · api-migrator

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.si/d/userfiles-app-bb450c

On your own machine, after `flisk up`:

- web: `http://app.app-demo.localhost/web`
- api: `http://api.app-demo.localhost/api/api/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
