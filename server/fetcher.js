const RssParser = require('rss-parser');
const axios = require('axios');

const parser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  }
});

// Lenient parser for feeds with XML issues
const lenientParser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  },
  strictDTD: false,
  customFields: {
    item: [],
  }
});

const FEEDS = [
  {
    name: 'e27',
    url: 'https://e27.co/feed/',
    category: 'Startups',
    sourceKey: 'E27'
  },
  {
    name: 'OpenGov Asia',
    url: 'https://opengovasia.com/feed/',
    category: 'Big Tech',
    sourceKey: 'OGV'
  },
  {
    name: 'Vulcan Post',
    url: 'https://vulcanpost.com/feed/',
    category: 'Startups',
    sourceKey: 'VPC'
  },
  {
    name: 'Singapore Business Review',
    url: 'https://sbr.com.sg/rss.xml',
    category: 'Funding',
    sourceKey: 'SBR'
  },
  // Keeping 4 strong SEA sources - e27, OpenGov Asia, Vulcan Post, SBR
];

// Attempt to fetch a feed by first getting raw XML and cleaning it
async function fetchFeedWithFallback(feed) {
  const startTime = Date.now();
  try {
    // Try direct parse first
    const result = await parser.parseURL(feed.url);
    return { result, startTime };
  } catch (directErr) {
    // Fallback: fetch raw XML, clean common issues, parse manually
    console.warn(`Direct parse failed for [${feed.name}], trying raw fetch...`);
    try {
      const resp = await axios.get(feed.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        responseType: 'text'
      });
      let xml = resp.data;
      // Clean malformed entities KrASIA-style: &someword=value
      xml = xml.replace(/&([a-zA-Z]+)(?=[=])/g, '&amp;$1');
      // Any other bare &
      xml = xml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, '&amp;');
      const result = await lenientParser.parseString(xml);
      return { result, startTime };
    } catch (fallbackErr) {
      throw new Error(fallbackErr.message);
    }
  }
}

async function fetchFeed(feed) {
  try {
    const { result, startTime } = await fetchFeedWithFallback(feed);
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
      fetchTimeMs: 0,
      articles: [],
      error: err.message
    };
  }
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content'].$) return item['media:content'].$.url;
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
