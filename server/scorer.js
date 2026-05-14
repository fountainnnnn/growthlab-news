// Relevance scoring and deduplication

const RELEVANCE_KEYWORDS = [
  // Geography (high weight)
  { words: ['singapore', 'sg '], weight: 15, category: 'Singapore' },
  { words: ['southeast asia', 'sea'], weight: 15, category: 'SEA' },
  { words: ['asean'], weight: 12, category: 'SEA' },
  { words: ['indonesia', 'jakarta'], weight: 10, category: 'SEA' },
  { words: ['malaysia', 'kuala lumpur'], weight: 10, category: 'SEA' },
  { words: ['vietnam', 'hanoi', 'ho chi minh'], weight: 10, category: 'SEA' },
  { words: ['thailand', 'bangkok'], weight: 10, category: 'SEA' },
  { words: ['philippines', 'manila'], weight: 10, category: 'SEA' },
  // Funding (high weight)
  { words: ['funding', 'raised', 'series a', 'series b', 'series c', 'seed round', 'pre-seed'], weight: 10, category: 'Funding' },
  { words: ['venture capital', 'vc'], weight: 8, category: 'VC' },
  { words: ['investor', 'investment', 'valuation'], weight: 7, category: 'VC' },
  // Sector
  { words: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt'], weight: 8, category: 'AI' },
  { words: ['saas', 'software as a service'], weight: 8, category: 'SaaS' },
  { words: ['fintech', 'financial technology'], weight: 7, category: 'Fintech' },
  { words: ['e-commerce', 'ecommerce', 'shopify'], weight: 6, category: 'E-Commerce' },
  // Startup ecosystem
  { words: ['startup', 'founder', 'entrepreneur'], weight: 8, category: 'Startups' },
  { words: ['product launch', 'launch', 'ship'], weight: 6, category: 'Product Launch' },
  { words: ['ipo', 'public offering', 'acquisition', 'exit'], weight: 7, category: 'Funding' },
  { words: ['accelerator', 'incubator', 'grant'], weight: 6, category: 'Startups' },
  { words: ['regulation', 'regulatory', 'compliance'], weight: 5, category: 'Big Tech' },
  // Tech giants
  { words: ['google', 'meta', 'apple', 'amazon', 'microsoft', 'openai'], weight: 4, category: 'Big Tech' },
  { words: ['b2b', 'enterprise', 'b2c'], weight: 4, category: 'SaaS' },
];

function scoreRelevance(article) {
  const text = (article.title + ' ' + (article.summary || '') + ' ' + article.source).toLowerCase();
  let score = 0;

  RELEVANCE_KEYWORDS.forEach(kw => {
    if (kw.words.some(w => text.includes(w))) {
      score += kw.weight;
    }
  });

  // Normalize to 0-100
  return Math.min(100, Math.round(score));
}

function extractCategories(article) {
  const text = (article.title + ' ' + (article.summary || '')).toLowerCase();
  const categories = new Set();

  // Add source category
  if (article.categories && article.categories.length) {
    article.categories.forEach(c => categories.add(c));
  }

  RELEVANCE_KEYWORDS.forEach(kw => {
    if (kw.words.some(w => text.includes(w))) {
      categories.add(kw.category);
    }
  });

  // Auto-detect additional categories
  if (text.includes('funding') || text.includes('raised') || text.includes('series')) categories.add('Funding');
  if (text.includes('ai') || text.includes('machine learning')) categories.add('AI');
  if (text.includes('saas')) categories.add('SaaS');
  if (text.includes('startup') || text.includes('founder')) categories.add('Startups');
  if (text.includes('venture') || text.includes('vc')) categories.add('VC');

  return Array.from(categories);
}

function deduplicate(articles) {
  const seen = new Set();
  const unique = [];

  for (const article of articles) {
    const key = article.url || article.id;
    // Simple title similarity: lowercase and normalize
    const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);

    if (!seen.has(key) && !seen.has(titleKey)) {
      seen.add(key);
      seen.add(titleKey);
      unique.push(article);
    }
  }

  return unique;
}

module.exports = { scoreRelevance, deduplicate, extractCategories, RELEVANCE_KEYWORDS };
