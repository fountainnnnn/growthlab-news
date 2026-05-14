// Channel-specific formatters

function formatWhatsApp(articles) {
  if (!articles || articles.length === 0) {
    return 'No relevant articles found today.';
  }

  const lines = ['GrowthLab Daily\n'];
  articles.slice(0, 8).forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title}`);
    lines.push(`   ${a.founderSummary || a.summary?.substring(0, 80) || ''}`);
    lines.push(`   ${a.source} | ${a.url}`);
    lines.push('');
  });
  lines.push('growthlab.com');

  return lines.join('\n');
}

function formatTelegram(articles) {
  if (!articles || articles.length === 0) {
    return 'No relevant articles found today.';
  }

  const lines = ['GrowthLab Daily Startup Intelligence'];
  lines.push('━━━━━━━━━━━━━━━━━━\n');

  articles.slice(0, 10).forEach((a, i) => {
    const score = a.relevanceScore >= 70 ? '🔥' : a.relevanceScore >= 40 ? '💡' : '📌';
    lines.push(`${score} ${a.title}`);
    lines.push(`   ${a.founderSummary || a.summary?.substring(0, 100) || ''}`);
    lines.push(`   ${a.source} | [Read](${a.url})`);
    lines.push('');
  });

  const now = new Date();
  lines.push(`Last updated: ${now.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} SGT`);
  lines.push('GrowthLab Intelligence');

  return lines.join('\n');
}

function formatGrowthLab(articles) {
  if (!articles || articles.length === 0) {
    return JSON.stringify({
      title: 'Daily Digest',
      date: new Date().toISOString().split('T')[0],
      summary: 'No relevant articles found today.',
      articles: []
    }, null, 2);
  }

  const items = articles.slice(0, 15).map(a => ({
    title: a.title,
    source: a.source,
    url: a.url,
    publishedDate: a.publishedDate,
    relevanceScore: a.relevanceScore,
    categories: a.categories,
    founderSummary: a.founderSummary,
    summary: a.summary?.substring(0, 200) || ''
  }));

  return JSON.stringify({
    title: 'Daily Startup Intelligence',
    date: new Date().toISOString().split('T')[0],
    totalArticles: articles.length,
    sourcesCount: new Set(articles.map(a => a.source)).size,
    summary: `Today's roundup covers ${articles.length} relevant articles across startup funding, AI, SaaS, and SEA ecosystem developments.`,
    articles: items
  }, null, 2);
}

module.exports = { formatWhatsApp, formatTelegram, formatGrowthLab };
