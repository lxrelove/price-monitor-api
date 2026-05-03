require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

// Helper: rileva valuta
function detectCurrency(price) {
  if (!price) return null;
  if (price.includes('€')) return 'EUR';
  if (price.includes('$')) return 'USD';
  if (price.includes('£')) return 'GBP';
  return 'unknown';
}

// Helper: scraping prezzo
async function scrapePrice(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const $ = cheerio.load(data);
  const selectors = ['[itemprop="price"]', '.price', '#price', '[class*="price"]', '[data-price]'];

  let price = null;
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      price = el.attr('content') || el.attr('data-price') || el.text().trim();
      if (price) break;
    }
  }

  // Pulizia duplicati e spazi
  if (price) {
    price = price.replace(/(.+)\1+/, '$1').trim();
  }

  return {
    url,
    price: price || 'not found',
    currency: detectCurrency(price),
    scraped_at: new Date().toISOString()
  };
}

// Route principale
app.get('/', (req, res) => {
  res.json({ name: 'Price Monitor API', status: 'running' });
});

// POST /price
app.post('/price', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const result = await scrapePrice(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));