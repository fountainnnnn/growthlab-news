const RssParser = require('rss-parser');
const parser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'GrowthLabNews/1.0 (SEA Founder Intelligence)'
  }
});

const FEEDS = [
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    category: 'Startups',
    sourceKey: 'HN'
  },
  {
    name: 'HN Launches',
    url: 'https://hnrss.org/launches',
    category: 'Product Launch',
    sourceKey: 'HN'
  },
  {
    name: 'HN Active',
    url: 'https://hnrss.org/active',
    category: 'Startups',
    sourceKey: 'HN'
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Big Tech',
    sourceKey: 'TC'
  },
  {
    name: 'VentureBeat',
    url: 'https://venturebeat.com/feed/',
    category: 'Funding',
    sourceKey: 'VB'
  }
  // Note: Product Hunt requires API key.
  // The Verge feed may be unstable - added as bonus if available
];

async function fetchFeed(feed) {
  const startTime = Date.now();
  try {
    const result = await parser.parseURL(feed.url);
    const articles = (result.items || []).map(item => ({
      id: item.link || item.guid || item.title,
      source: feed.name,
      sourceKey: feed.sourceKey,
      title: (item.title || '').trim(),
      url: item.link || '',
      publishedDate: item.isoDate || item.pubDate || new Date().toISOString(),
      summary: (item.contentSnippet || item.content || '')
        .replace(/<[^>]*>/g, '')
        .substring(0, 500)
        .trim(),
      content: (item.content || item.contentSnippet || '')
        .replace(/<[^>]*>/g, '')
        .substring(0, 2000)
        .trim(),
      imageUrl: extractImage(item),
      categories: [feed.category],
      sourceFeed: feed.url
    }));

    return {
      name: feed.name,
      online: true,
      articleCount: articles.length,
      fetchTimeMs: Date.now() - startTime,
      articles
    };
  } catch (err) {
    console.warn(`Feed error [${feed.name}]: ${err.message}`);
    return {
      name: feed.name,
      online: false,
      articleCount: 0,
      fetchTimeMs: Date.now() - startTime,
      articles: [],
      error: err.message
    };
  }
}

function extractImage(item) {
  // Try various image sources from RSS
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  // Check for media:content
  if (item['media:content'] && item['media:content'].$) return item['media:content'].$.url;
  // Try to find first image in content
  const content = item.content || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];
  return null;
}

async function fetchAllSources() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const sources = [];
  const allArticles = [];
  let totalFetched = 0;

  results.forEach(r => {
    if (r.status === 'fulfilled') {
      const result = r.value;
      sources.push({
        name: result.name,
        online: result.online,
        articleCount: result.articleCount,
        fetchTimeMs: result.fetchTimeMs,
        error: result.error || null
      });
      totalFetched += result.articles.length;
      allArticles.push(...result.articles);
    } else {
      sources.push({
        name: 'Unknown',
        online: false,
        articleCount: 0,
        error: r.reason?.message || 'Unknown error'
      });
    }
  });

  return { sources, articles: allArticles, totalFetched };
}

module.exports = { fetchAllSources };
