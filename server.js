const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(express.json());
app.use(express.static('public'));

const N8N_BASE = process.env.N8N_BASE_URL || 'https://n8n.austheim.app';
const N8N_RUN_WEBHOOK = `${N8N_BASE}/webhook/fb-marketplace-run`;
const N8N_CONFIG_WEBHOOK = `${N8N_BASE}/webhook/fb-marketplace-config`;

// GET config from n8n
app.get('/api/config', async (req, res) => {
  try {
    const r = await fetch(N8N_CONFIG_WEBHOOK);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SAVE config to n8n
app.post('/api/config', async (req, res) => {
  try {
    const r = await fetch(N8N_CONFIG_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TRIGGER scrape
app.post('/api/run', async (req, res) => {
  try {
    const r = await fetch(N8N_RUN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeout: 600000
    });
    const contentType = r.headers.get('content-type') || '';
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text.substring(0, 500) }; }
    res.json({ ok: true, result: Array.isArray(data) ? data : [data] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FB Marketplace UI on port ${PORT}`));
