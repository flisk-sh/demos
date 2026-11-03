- Demo page: https://demo.flisk.sh/d/sl1ma4-agents-07d1ce
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/41722916958

# Flisk demo for @sl1ma4

web · api · api-migrator · tools · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/sl1ma4-agents-07d1ce

On your own machine, after `flisk up`:

- web: `http://app.agents-demo.localhost/web`
- api: `http://api.agents-demo.localhost/api/api/health`
- assistant: `http://api.agents-demo.localhost/api/assistant/health`
- tools: `http://api.agents-demo.localhost/api/tools/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
