- Demo page: https://demo.flisk.sh/d/ada_test2-agents-efcf2c
- Built by GitHub Actions: https://github.com/flisk-sh/flisk-demo-worker/actions/runs/40601581403

# Flisk demo for @ada_test2

web · api · api-migrator · jobs · tools · assistant

```bash
npm install -g @flisk-sh/flisk
flisk doctor
flisk up
```

Live links, while a live run is up (click them on the demo page):
https://demo.flisk.sh/d/ada_test2-agents-efcf2c

On your own machine, after `flisk up`:

- reservation-app: `http://app.flisk-restaurant-example.localhost/reservation-app`
- floor-app: `http://app.flisk-restaurant-example.localhost/floor-app`
- assistant: `http://api.flisk-restaurant-example.localhost/api/assistant/health`
- tools: `http://api.flisk-restaurant-example.localhost/api/tools/health`
- reservation-api: `http://api.flisk-restaurant-example.localhost/api/reservation/health`
- kitchen-api: `http://api.flisk-restaurant-example.localhost/api/kitchen/health`
- menu-api: `http://api.flisk-restaurant-example.localhost/api/menu/health`

Edit any service under `services/` and it reloads. `flisk status` shows what is running.
