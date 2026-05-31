# FB Marketplace Scraper UI

Dashboard for managing and running FB Marketplace searches, backed by n8n + Google Sheets.

## Coolify Deployment

1. Push this repo to GitHub (e.g. `github.com/torespen/fb-marketplace-ui`)
2. In Coolify: New Resource → GitHub → select repo
3. Set environment variable: `N8N_WEBHOOK_URL=https://n8n.austheim.app/webhook/fb-marketplace-run`
4. Port: `3000`
5. Deploy

## Features

- Add/remove FB Marketplace search URLs with tab names
- Config persists to `config.json`
- Trigger n8n scrape from the UI
- Spinner with live status steps during scrape (~2–5 min)
- Results shown per tab: new listings, price changes, sold items
- All results also written to Google Sheets
