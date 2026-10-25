- Demo page: https://demo.flisk.sh/d/ada_test-agents-049dc5
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40223611715

# Flisk demo for @ada_test

web · api · api-migrator · jobs · tools · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/ada_test-agents-049dc5

On your own machine, after `flisk up`:

- reservation-app: `http://app.agents-demo.localhost/reservation-app/health`
- floor-app: `http://app.agents-demo.localhost/floor-app/health`
- assistant: `http://api.agents-demo.localhost/api/assistant/health`
- tools: `http://api.agents-demo.localhost/api/tools/health`
- reservation-api: `http://api.agents-demo.localhost/api/reservation/health`
- kitchen-api: `http://api.agents-demo.localhost/api/kitchen/health`
- menu-api: `http://api.agents-demo.localhost/api/menu/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
