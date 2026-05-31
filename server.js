const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());

// ── Config ──────────────────────────────────────────────────────────────────
const N8N_BASE   = process.env.N8N_BASE_URL   || 'https://n8n.austheim.app';
const N8N_RUN    = `${N8N_BASE}/webhook/fb-marketplace-run`;
const N8N_CONFIG = `${N8N_BASE}/webhook/fb-marketplace-config`;
const API_KEY    = process.env.API_KEY;
const PORT       = process.env.PORT || 3000;
const RUN_TIMEOUT_MS = parseInt(process.env.RUN_TIMEOUT_MS || '600000', 10);

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ── Auth middleware ──────────────────────────────────────────────────────────
// Skipped if API_KEY env var is not set (dev mode)
function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const provided = req.headers['x-api-key'] || req.query.apiKey;
  if (provided !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Static files (served without auth so the UI itself loads) ────────────────
app.use(express.static('public'));

// ── API routes ───────────────────────────────────────────────────────────────

// Public: tells the frontend what it needs to bootstrap (sheet ID, auth flag)
app.get('/api/client-config', (req, res) => {
  res.json({
    sheetId:      process.env.SHEET_ID || '',
    requiresAuth: !!API_KEY,
  });
});

app.use('/api', requireApiKey);

// GET config from n8n (_config sheet via webhook)
app.get('/api/config', async (req, res) => {
  try {
    const r = await fetchWithTimeout(N8N_CONFIG, {}, 10000);
    if (!r.ok) throw new Error(`n8n config returned ${r.status}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('[config GET]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST config to n8n (_config sheet via webhook)
app.post('/api/config', async (req, res) => {
  try {
    const r = await fetchWithTimeout(
      N8N_CONFIG,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      10000
    );
    if (!r.ok) throw new Error(`n8n config returned ${r.status}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('[config POST]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/run — load current config, pass to n8n scraper
app.post('/api/run', async (req, res) => {
  // Step 1: fetch latest config (short timeout — fail fast if n8n is down)
  let searches;
  try {
    const configRes = await fetchWithTimeout(N8N_CONFIG, {}, 10000);
    if (!configRes.ok) throw new Error(`n8n config returned ${configRes.status}`);
    const config = await configRes.json();
    searches = config.searches || [];
  } catch (err) {
    console.error('[run] config fetch failed:', err.message);
    return res.status(502).json({ ok: false, error: `Could not load config: ${err.message}` });
  }

  if (!searches.length) {
    return res.status(400).json({ ok: false, error: 'No searches configured.' });
  }

  // Step 2: trigger the scrape (long timeout)
  try {
    const r = await fetchWithTimeout(
      N8N_RUN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrls: searches.map(s => s.url),
          tabNames:   searches.map(s => s.tag),
        }),
      },
      RUN_TIMEOUT_MS
    );

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text.substring(0, 500) }; }

    if (!r.ok) {
      console.error('[run] n8n returned', r.status, text.substring(0, 200));
      return res.status(502).json({ ok: false, error: `n8n returned ${r.status}`, detail: data });
    }

    res.json({ ok: true, result: Array.isArray(data) ? data : [data] });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('[run]', isTimeout ? 'timed out' : err.message);
    res.status(isTimeout ? 504 : 502).json({
      ok: false,
      error: isTimeout ? `Scrape timed out after ${RUN_TIMEOUT_MS / 1000}s` : err.message,
    });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`FB Marketplace UI on port ${PORT}`));
