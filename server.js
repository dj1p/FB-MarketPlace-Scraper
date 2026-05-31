const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(express.json());
app.use(express.static('public'));

const CONFIG_FILE = path.join(__dirname, 'config.json');
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL || 'https://n8n.austheim.app/webhook/fb-marketplace-run';

// Default config
const DEFAULT_CONFIG = {
  searches: [
    { url: 'https://www.facebook.com/marketplace/bangkok/search/?query=%20logitech%20keyboard', tag: 'Logitech Keyboard' },
    { url: 'https://www.facebook.com/marketplace/bangkok/search?maxPrice=3500&query=dell%20monitor&exact=false', tag: 'Dell Monitor' },
    { url: 'https://www.facebook.com/marketplace/bangkok/search/?query=logitech%20mx', tag: 'Logitech MX' }
  ]
};

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// GET config
app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

// SAVE config
app.post('/api/config', (req, res) => {
  const { searches } = req.body;
  if (!searches || !Array.isArray(searches)) return res.status(400).json({ error: 'Invalid config' });
  saveConfig({ searches });
  res.json({ ok: true });
});

// TRIGGER workflow
app.post('/api/run', async (req, res) => {
  const config = loadConfig();
  const searchUrls = config.searches.map(s => s.url);
  const tabNames = config.searches.map(s => s.tag);

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchUrls, tabNames }),
      timeout: 600000 // 10 min
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    let data;
    if (contentType.includes('application/json')) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    } else {
      // n8n sometimes returns plain text or HTML on errors
      try { data = JSON.parse(text); } catch { data = { message: text.substring(0, 500) }; }
    }

    res.json({ ok: true, result: Array.isArray(data) ? data : [data] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FB Marketplace UI running on port ${PORT}`));
