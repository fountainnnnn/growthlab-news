# GrowthLab Intelligence — Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Dashboard Guide](#dashboard-guide)
7. [Telegram Publisher](#telegram-publisher)
8. [Deployment](#deployment)
9. [Source Feeds](#source-feeds)
10. [Troubleshooting](#troubleshooting)

---

## Overview

GrowthLab Intelligence is a daily startup news intelligence tool built for Singapore and SEA founders. It aggregates news from regional sources, scores articles for founder relevance, and provides a polished dashboard for browsing, filtering, and publishing curated digests to Telegram.

### Core Loop

```
RSS Feeds → Fetch → Deduplicate → Score Relevance → Build Digest → Dashboard Preview → Edit → Post to Telegram
                                  ↕
                          Auto-posts daily at 8am SGT
```

### What It Solves

SEA founders currently browse 5-10 sources manually to find relevant news. This agent pulls from 4 SEA-focused feeds, filters for founder-relevant signals (funding rounds, AI/SaaS trends, regulatory changes, product launches), and delivers a single curated digest that can be posted to Telegram in one click.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Express Server                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Fetcher  │  │  Scorer  │  │   Formatter      │  │
│  │ (RSS)    │→ │(Keyword) │→ │(WhatsApp/Telegram│  │
│  │          │  │          │  │ /GrowthLab)      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│         │              │              │             │
│         ▼              ▼              ▼             │
│  ┌──────────────────────────────────────────────┐   │
│  │            In-Memory Cache                   │   │
│  │  articles: Article[], digest: Digest          │   │
│  └──────────────────────────────────────────────┘   │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │          Express API Routes                   │   │
│  │  /api/health /api/news/latest /api/digest     │   │
│  │  /api/refresh /api/post/telegram /api/sources │   │
│  └──────────────────────────────────────────────┘   │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │         Static Frontend (Vite + React)        │   │
│  │  client/dist/ → served at /                   │   │
│  └──────────────────────────────────────────────┘   │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │          Cron Scheduler (node-cron)           │   │
│  │  Daily 00:00 UTC → refresh → auto-post TG     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Startup**: Server initializes, fetches all RSS feeds, caches articles
2. **Refresh**: Articles fetched → deduplicated (by URL + normalized title) → scored (0-100) → categorized → sorted by recency
3. **Digest Build**: Top relevant articles selected → channel-formatted → cached as digest
4. **Dashboard**: React app fetches from `/api/news/latest` and `/api/digest/today` on load, auto-refreshes every 5 minutes
5. **Publish**: User edits message on Telegram Publish tab → clicks Post → Express posts via Telegram Bot API

---

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone
git clone https://github.com/fountainnnnn/growthlab-news.git
cd growthlab-news

# Install backend dependencies
npm install

# Install and build frontend
cd client
npm install
npx vite build
cd ..
```

### Running

```bash
# Set port (optional, defaults to 5932)
export PORT=5932

# Start server
node server/index.js
```

Server binds to `0.0.0.0:${PORT}` by default.

### Development Mode

```bash
# Terminal 1: Backend
PORT=5932 node server/index.js

# Terminal 2: Frontend with hot reload
cd client
npx vite --port 5173
```

In development, the Vite dev server proxies `/api` requests to `localhost:5932`.

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5932
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_or_channel_id
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5932` | Server listen port |
| `TELEGRAM_BOT_TOKEN` | For Telegram | — | Bot token from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | For Telegram | — | Target chat/channel ID for posting |

### RSS Sources

Sources are configured in `server/fetcher.js`. Default sources:

| Name | Feed URL | Focus | Source Key |
|------|----------|-------|------------|
| e27 | `https://e27.co/feed/` | SEA startup ecosystem | E27 |
| OpenGov Asia | `https://opengovasia.com/feed/` | Asia tech & policy | OGV |
| Vulcan Post | `https://vulcanpost.com/feed/` | Singapore tech & startups | VPC |
| Singapore Business Review | `https://sbr.com.sg/rss.xml` | Singapore business & funding | SBR |

To add or remove sources, edit the `FEEDS` array in `server/fetcher.js` and restart.

---

## API Reference

### `GET /api/health`

Returns server status.

```json
{
  "status": "ok",
  "uptime": 3600,
  "sourcesOnline": 4,
  "lastRefresh": "2026-05-14T00:00:00.000Z",
  "articleCount": 125
}
```

### `GET /api/news/latest`

Returns articles with optional filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category (AI, SaaS, Funding, VC, Startups, Product Launch, Big Tech) |
| `q` | string | Search by keyword in title/summary |
| `time` | string | Time filter: `today`, `24h`, `7d` |

**Response:**
```json
{
  "articles": [
    {
      "id": "https://e27.co/example",
      "source": "e27",
      "sourceKey": "E27",
      "title": "SEA startup raises $2M seed round",
      "url": "https://e27.co/example",
      "publishedDate": "2026-05-14T06:00:00.000Z",
      "summary": "Singapore-based startup...",
      "categories": ["Funding", "Startups"],
      "relevanceScore": 78,
      "founderSummary": "Key signal for founders tracking investment trends in the region."
    }
  ],
  "total": 10,
  "sourcesOnline": 4,
  "lastRefresh": "2026-05-14T00:00:00.000Z",
  "allArticlesCount": 125
}
```

### `GET /api/digest/today`

Returns today's curated digest with channel-formatted text.

```json
{
  "digest": {
    "date": "2026-05-14",
    "relevantCount": 26,
    "totalArticles": 125,
    "sourcesOnline": 4,
    "topKeywords": ["ai", "funding", "singapore"],
    "mostActiveSource": "e27",
    "channelFormats": {
      "telegram": "GrowthLab Daily Startup Intelligence\n━━━━━━━━━━━━━━━━━━\n\n📌 ...",
      "growthlab": "{ ... }"
    }
  }
}
```

### `POST /api/refresh`

Manually trigger a full refresh from RSS feeds.

```json
{
  "status": "ok",
  "articlesFetched": 145,
  "newArticles": 125,
  "relevantCount": 26
}
```

### `POST /api/digest/regenerate`

Re-generate the digest with a different article selection. Picks a shuffled subset from the cached article pool.

```json
{
  "status": "ok",
  "digest": {
    "channelFormats": { "telegram": "...", "growthlab": "..." },
    "relevantCount": 22
  }
}
```

### `POST /api/post/telegram`

Posts the current digest's Telegram format to the configured chat.

```json
{
  "status": "ok",
  "messageId": 42,
  "chatId": "5182673437"
}
```

Returns `{"status": "not_configured"}` if TELEGRAM_BOT_TOKEN is not set.

### `POST /api/post/telegram/custom`

Posts a custom message to Telegram.

**Request Body:**
```json
{
  "text": "Your custom message here"
}
```

**Response:**
```json
{
  "status": "ok",
  "messageId": 43
}
```

### `GET /api/sources`

Returns source health status.

```json
{
  "sources": [
    {
      "name": "e27",
      "online": true,
      "articleCount": 50,
      "fetchTimeMs": 1500,
      "error": null
    }
  ]
}
```

---

## Dashboard Guide

### News Feed Tab

- **Article Cards**: Each card shows source badge, title (2-line clamp), summary, founder summary (italic purple), category pills, and relevance score
- **Stats Bar**: 4 stat blocks — total articles, sources online, relevant articles, top keyword
- **Category Pills**: Filter by AI, SaaS, Funding, VC, Startups, Product Launch, Big Tech
- **Time Filters**: All Time, Today, Last 24h, Last 7 days
- **Search**: Filter by keyword across title and summary
- **Refresh Button**: Manual re-fetch from all RSS sources (shows spinner during refresh)
- **Auto-Refresh**: Dashboard auto-refreshes every 5 minutes

### Telegram Publish Tab

1. **Preview Bubble**: Simulated Telegram chat message showing how the post will look
2. **Editable Textarea**: Full control over the message text (character count shown)
3. **Shuffle Articles**: Re-generates digest with different article selection
4. **Post to Telegram**: Sends the current textarea content to your Telegram channel
5. **Status Feedback**: Shows "Shuffled!", "Posted!", or error state after actions

---

## Telegram Publisher

### How It Works

1. Auto-generated digest text is loaded into the Telegram tab on first visit
2. The preview bubble mimics actual Telegram rendering
3. `[text](url)` Markdown links render as clickable blue links in both preview and actual post
4. Click **Shuffle Articles** to get a different set of articles (uses varying relevance thresholds)
5. Edit freely — the textarea is a full editor
6. Click **Post to Telegram** to send

### Auto-Posting

The server automatically posts a fresh digest to Telegram at **00:00 UTC daily** (8am SGT) after completing the daily refresh. This only fires if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set.

### Format

The Telegram format includes:
- Header with branding
- Separator line
- Articles with emoji indicators (🔥 high relevance, 💡 medium, 📌 standard)
- Title, 1-2 line founder summary, source attribution, and clickable `[Read]` link
- Footer with update timestamp and branding

---

## Deployment

### VPS (Recommended)

This server runs as a persistent Node.js process. Recommended for VPS:

```bash
# Using PM2
npm install -g pm2
cd /path/to/growthlab-news
PORT=5932 pm2 start server/index.js --name growthlab-news
pm2 save
pm2 startup

# Using systemd (example)
[Unit]
Description=GrowthLab News
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/path/to/growthlab-news
ExecStart=/usr/bin/node server/index.js
Environment=PORT=5932
Environment=TELEGRAM_BOT_TOKEN=xxx
Environment=TELEGRAM_CHAT_ID=xxx
Restart=always

[Install]
WantedBy=multi-user.target
```

### Cloud Platforms

The app requires a persistent process — it will NOT work on Vercel (serverless) without significant refactoring. Recommended platforms:

| Platform | Works | Notes |
|----------|-------|-------|
| Railway | Yes | Zero config, persistent |
| Render | Yes | Web Service type |
| Fly.io | Yes | Docker or Node deploy |
| DigitalOcean App Platform | Yes | Persistent process |
| Your own VPS | Yes | PM2 or systemd |

### SSH Tunnel (for local testing)

```bash
ssh -L 5932:127.0.0.1:5932 user@your-vps
# Open http://localhost:5932
```

---

## Source Feeds

| Source | Category | Reliability | Notes |
|--------|----------|-------------|-------|
| e27 | Startups | High | Singapore-based SEA startup ecosystem |
| OpenGov Asia | Big Tech | High | Asia tech policy and innovation |
| Vulcan Post | Startups | Medium | Singapore tech & startup lifestyle |
| Singapore Business Review | Funding | High | Singapore business news, funding, regulation |

All sources are free public RSS feeds. No API keys required.

### Adding a Source

In `server/fetcher.js`, add an entry to the `FEEDS` array:

```javascript
{
  name: 'Your Source',
  url: 'https://example.com/feed',
  category: 'Funding',     // Primary category for articles
  sourceKey: 'YSR'         // Short badge code (3 chars)
}
```

Then add the badge color in `client/src/components/ArticleCard.tsx`:

```typescript
const SOURCE_COLORS: Record<string, string> = {
  'YSR': '#HexColor',
  // ... existing colors
};
```

Restart the server to pick up changes.

---

## Troubleshooting

### Server won't start

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5932
```

Kill the existing process: `fuser -k 5932/tcp`

### RSS feed failing

Common issues:
- **403 Forbidden**: Source blocks scraping. Try using a different User-Agent header in `server/fetcher.js`
- **503 Service Unavailable**: Source is rate-limiting or down. It will auto-retry on next refresh
- **XML/parse errors**: Some feeds have malformed XML. The server tries a raw-fetch fallback with XML cleaning

### Telegram not posting

Check:
1. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set in `.env`
2. The bot token is valid (test with `curl https://api.telegram.org/bot<token>/getMe`)
3. The bot has been added to the target chat/channel and has send permissions

### Dashboard shows no articles

1. Check `/api/health` — if sourcesOnline is 0, RSS feeds may all be down
2. Trigger manual refresh from the dashboard
3. Check server logs for feed errors

### Port already in use

```bash
# Find and kill the process
lsof -i :5932
kill -9 <PID>
```

### Git remote token exposure

If you accidentally committed a token in the git remote URL, rotate it and update:
```bash
git remote set-url origin https://github.com/yourname/repo.git
```
