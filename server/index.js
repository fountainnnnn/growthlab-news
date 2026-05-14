const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { fetchAllSources } = require('./fetcher');
const { scoreRelevance, deduplicate, extractCategories } = require('./scorer');
const { formatWhatsApp, formatTelegram, formatGrowthLab } = require('./formatter');
const { postToTelegram } = require('./poster');
const cron = require('node-cron');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5932;

app.use(cors());
app.use(express.json());

// Serve built client
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));

// In-memory cache
let cache = {
  articles: [],
  digest: null,
  sources: [],
  lastRefresh: null,
  sourcesOnline: 0,
  totalFetched: 0,
  isRefreshing: false
};

const UPTIME_START = Date.now();

async function runRefresh() {
  if (cache.isRefreshing) return { status: 'already_refreshing' };
  cache.isRefreshing = true;

  try {
    const result = await fetchAllSources();
    const deduped = deduplicate(result.articles);
    const scored = deduped.map(a => ({
      ...a,
      relevanceScore: scoreRelevance(a),
      categories: extractCategories(a),
      founderSummary: generateFounderSummary(a)
    }));

    scored.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

    cache.articles = scored;
    cache.sources = result.sources;
    cache.sourcesOnline = result.sources.filter(s => s.online).length;
    cache.totalFetched = result.totalFetched;
    cache.lastRefresh = new Date().toISOString();

    buildDigest(scored);

    return { status: 'ok', articlesFetched: result.totalFetched, newArticles: scored.length, relevantCount: cache.digest?.relevantCount || 0 };
  } catch (err) {
    console.error('Refresh error:', err.message);
    return { status: 'error', message: err.message };
  } finally {
    cache.isRefreshing = false;
  }
}

function generateFounderSummary(article) {
  const title = article.title.toLowerCase();
  const summary = article.summary || '';

  if (title.includes('funding') || title.includes('raised') || title.includes('series')) {
    return 'Key signal for founders tracking investment trends in the region. ';
  }
  if (title.includes('ai') || title.includes('saas') || title.includes('fintech')) {
    return 'Relevant sector intelligence. Could indicate shifting market dynamics. ';
  }
  if (title.includes('regulation') || title.includes('grant') || title.includes('policy')) {
    return 'Policy change alert. May affect compliance or grant access for early-stage founders. ';
  }
  if (title.includes('launch') || title.includes('product') || title.includes('announce')) {
    return 'New entrant or feature launch. Worth reviewing for competitive intelligence. ';
  }
  if (summary.length > 40) {
    return summary.substring(0, 120) + '... ';
  }
  return 'Relevant reading for SEA founders monitoring the startup ecosystem. ';
}

function extractTopKeywords(articles) {
  const keywordMap = {};
  const keywords = ['funding', 'ai', 'saas', 'startup', 'venture', 'fintech', 'e-commerce', 'sea', 'singapore', 'indonesia', 'malaysia', 'vietnam', 'thailand', 'philippines', 'blockchain', 'regulation', 'ipo', 'acquisition', 'growth', 'seed'];
  articles.forEach(a => {
    const text = (a.title + ' ' + (a.summary || '')).toLowerCase();
    keywords.forEach(kw => {
      if (text.includes(kw)) {
        keywordMap[kw] = (keywordMap[kw] || 0) + 1;
      }
    });
  });
  return Object.entries(keywordMap).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}

function getMostActiveSource(articles) {
  const counts = {};
  articles.forEach(a => {
    counts[a.source] = (counts[a.source] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}

// Shuffle an array in-place (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build digest from a scored article list, optionally shuffling for variety
function buildDigest(scored, shuffleRelevant = false) {
  let relevant = scored.filter(a => a.relevanceScore >= 30);

  // If not enough relevant, lower threshold to catch more
  if (relevant.length < 5) {
    relevant = scored.filter(a => a.relevanceScore >= 15);
  }
  if (relevant.length < 5 && scored.length > 0) {
    relevant = scored.slice(0, 15);
  }

  // Shuffle for variety -- pick random articles regardless of score
  if (shuffleRelevant && scored.length > 3) {
    // Randomly pick articles from the full pool
    const count = Math.min(12, scored.length);
    const pool = shuffle([...scored]);
    // Mix high-scored with random ones to keep relevance
    const highScored = pool.filter(a => a.relevanceScore >= 25).slice(0, 4);
    const randomOnes = shuffle(pool.filter(a => a.relevanceScore < 25 || Math.random() > 0.5)).slice(0, count - highScored.length);
    relevant = shuffle([...highScored, ...randomOnes]);
  }

  const keywords = extractTopKeywords(relevant);

  cache.digest = {
    date: new Date().toISOString().split('T')[0],
    articles: relevant,
    totalArticles: scored.length,
    relevantCount: relevant.length,
    sourcesOnline: cache.sourcesOnline,
    topKeywords: keywords.slice(0, 5),
    mostActiveSource: getMostActiveSource(scored),
    lastRefreshedAt: cache.lastRefresh,
    channelFormats: {
      whatsapp: formatWhatsApp(relevant),
      telegram: formatTelegram(relevant),
      growthlab: formatGrowthLab(relevant)
    }
  };

  return cache.digest;
}

// ─── API Routes ───────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - UPTIME_START) / 1000),
    sourcesOnline: cache.sourcesOnline,
    lastRefresh: cache.lastRefresh,
    articleCount: cache.articles.length
  });
});

app.get('/api/news/latest', (req, res) => {
  let articles = [...cache.articles];
  const { category, q, time } = req.query;

  if (category && category !== 'all') {
    const catLower = category.toLowerCase();
    articles = articles.filter(a => a.categories.some(c => c.toLowerCase() === catLower));
  }
  if (q) {
    const query = q.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      (a.summary && a.summary.toLowerCase().includes(query))
    );
  }
  if (time) {
    const now = Date.now();
    const limits = {
      'today': 24 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const ms = limits[time];
    if (ms) {
      articles = articles.filter(a => (now - new Date(a.publishedDate).getTime()) < ms);
    }
  }

  res.json({
    articles,
    total: articles.length,
    sourcesOnline: cache.sourcesOnline,
    lastRefresh: cache.lastRefresh,
    allArticlesCount: cache.articles.length
  });
});

app.get('/api/digest/today', (req, res) => {
  if (!cache.digest) {
    return res.json({ digest: null, message: 'No digest yet. Run refresh first.' });
  }
  res.json({ digest: cache.digest });
});

app.post('/api/digest/regenerate', (req, res) => {
  if (cache.articles.length === 0) {
    return res.json({ status: 'error', message: 'No articles cached. Run refresh first.' });
  }
  const digest = buildDigest(cache.articles, true);
  res.json({
    status: 'ok',
    digest: {
      channelFormats: digest.channelFormats,
      relevantCount: digest.relevantCount
    }
  });
});

app.post('/api/refresh', async (req, res) => {
  const result = await runRefresh();
  res.json(result);
});

app.post('/api/post/telegram', async (req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return res.json({ status: 'not_configured', message: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env' });
  }
  if (!cache.digest) {
    return res.json({ status: 'no_digest', message: 'Run refresh first to generate a digest.' });
  }
  try {
    const result = await postToTelegram(cache.digest.channelFormats.telegram);
    res.json(result);
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

app.post('/api/post/telegram/custom', async (req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return res.json({ status: 'not_configured', message: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env' });
  }
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.json({ status: 'error', message: 'No text provided. Send { "text": "your message" }' });
  }
  try {
    const result = await postToTelegram(text.trim());
    res.json(result);
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

app.get('/api/sources', (req, res) => {
  res.json({ sources: cache.sources });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// ─── Startup ──────────────────────────────────────────────

async function start() {
  console.log('GrowthLab News Dashboard starting...');
  await runRefresh();
  console.log(`Initial refresh complete: ${cache.articles.length} articles loaded`);

  // Schedule daily refresh at 8am SGT (midnight UTC)
  cron.schedule('0 0 * * *', async () => {
    console.log('Scheduled daily refresh...');
    await runRefresh();
    console.log('Daily refresh complete');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrowthLab News Dashboard running on http://0.0.0.0:${PORT}`);
    console.log(`Dashboard URL: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`API: http://localhost:${PORT}/api/news/latest`);
  });
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
