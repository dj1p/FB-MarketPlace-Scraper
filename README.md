# FB Marketplace Scraper UI

Dashboard for managing and running FB Marketplace searches, backed by n8n + Google Sheets.

## Coolify Deployment

1. Push this repo to GitHub
2. In Coolify: New Resource → GitHub → select repo
3. Set environment variables (see below)
4. Port: `3000`
5. Deploy

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `N8N_BASE_URL` | No | Base URL of your n8n instance (default: `https://n8n.austheim.app`) |
| `SHEET_ID` | Yes | Google Sheets ID for the results sheet |
| `API_KEY` | Recommended | Shared secret for `/api/*` endpoints. If unset, API is open (dev mode) |
| `PORT` | No | HTTP port (default: `3000`) |
| `RUN_TIMEOUT_MS` | No | Scrape timeout in ms (default: `600000` = 10 min) |

Copy `.env.example` → `.env` for local dev, then run `npm run dev`.

## Features

- Add/remove FB Marketplace search URLs with tab names
- Config persists via n8n webhook → Google Sheets
- Trigger n8n scrape from the UI
- Spinner with live status steps during scrape (~2–5 min)
- Results shown per tab: new listings, price changes, sold items
- All results also written to Google Sheets
- `/health` endpoint for uptime monitoring

## n8n Webhooks Expected

| Path | Method | Purpose |
|---|---|---|
| `/webhook/fb-marketplace-config` | GET | Load current search config |
| `/webhook/fb-marketplace-config` | POST | Save updated search config |
| `/webhook/fb-marketplace-run` | POST | Trigger scrape, returns results |
