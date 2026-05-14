# GrowthLab Intelligence

Daily startup news aggregator and Telegram publisher for SEA founders.

Fetches articles from Singapore and Southeast Asian sources, scores for founder relevance, and lets you preview, edit, and post curated digests to Telegram.

## Features

- **4 SEA-focused sources** — e27, OpenGov Asia, Vulcan Post, Singapore Business Review
- **Smart deduplication** — removes duplicate articles by URL and title similarity
- **Relevance scoring** — keyword-based scoring for founder usefulness (funding, AI, SaaS, SEA ecosystem)
- **Category filters** — AI, SaaS, Funding, VC, Startups, Product Launch, Big Tech
- **Search & time filters** — search by keyword, filter by Today / Last 24h / Last 7 days
- **Telegram Publisher** — dedicated view with editable message, article shuffle, and one-click post
- **Auto-posting** — refreshes feeds and posts digest to Telegram daily at 8am SGT
- **Channel formatting** — Telegram, GrowthLab API-ready formats
- **Real-time dashboard** — live article cards, source health, stats bar, auto-refresh every 5 min

## Quick Start

```bash
git clone https://github.com/fountainnnnn/growthlab-news.git
cd growthlab-news
npm install
cd client && npm install && npx vite build && cd ..
cp .env.example .env
# Add your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
PORT=5932 node server/index.js
```

Open `http://localhost:5932` in your browser.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5932) |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | For Telegram | Chat/channel ID to post to |

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status, uptime, sources online |
| `/api/news/latest` | GET | Articles with optional `?category=`, `?q=`, `?time=` filters |
| `/api/digest/today` | GET | Today's curated digest with channel formats |
| `/api/digest/regenerate` | POST | Re-generate digest with shuffled articles |
| `/api/refresh` | POST | Manual refresh from RSS feeds |
| `/api/post/telegram` | POST | Post digest to Telegram |
| `/api/post/telegram/custom` | POST | Post custom text to Telegram |
| `/api/sources` | GET | Source health and article counts |

## Tech Stack

- **Backend:** Node.js, Express, rss-parser, node-cron
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Deployment:** Persistent Node.js process (VPS / Railway / Render / Fly.io)

## License

MIT
