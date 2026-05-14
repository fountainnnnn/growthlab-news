import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar, StatsBar, FilterBar, ChannelPreview } from './components/Dashboard';
import { ArticleCard } from './components/ArticleCard';
import { getLatestNews, triggerRefresh, getTodayDigest, postToTelegram } from './api';
import type { Article, Digest, TimeFilter, ChannelType } from './types';

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [relevantCount, setRelevantCount] = useState(0);
  const [sourcesOnline, setSourcesOnline] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);

  const [activeCategory, setActiveCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('telegram');
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setError(null);
      const data = await getLatestNews({
        category: activeCategory === 'all' ? undefined : activeCategory,
        q: searchQuery || undefined,
        time: timeFilter === 'all' ? undefined : timeFilter,
      });
      setArticles(data.articles);
      setTotalArticles(data.allArticlesCount);
      setSourcesOnline(data.sourcesOnline);
      if (data.lastRefresh) setLastRefresh(data.lastRefresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    }
  }, [activeCategory, searchQuery, timeFilter]);

  const fetchDigest = useCallback(async () => {
    try {
      const data = await getTodayDigest();
      if (data.digest) {
        setDigest(data.digest);
        setRelevantCount(data.digest.relevantCount);
        setTopKeywords(data.digest.topKeywords);
        setTotalArticles(data.digest.totalArticles);
        setSourcesOnline(data.digest.sourcesOnline);
      }
    } catch {
      // digest may not exist yet
    }
  }, []);

  const loadAll = useCallback(() => {
    fetchNews();
    fetchDigest();
  }, [fetchNews, fetchDigest]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshIntervalRef.current = setInterval(loadAll, 5 * 60 * 1000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [loadAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await triggerRefresh();
      if (result.status === 'ok') {
        await loadAll();
      }
    } catch (err) {
      setError('Refresh failed. Check server connection.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostTelegram = async () => {
    setPostStatus('posting...');
    try {
      const result = await postToTelegram();
      setPostStatus(result.status === 'ok' ? 'Posted!' : result.message || 'Error');
    } catch (err) {
      setPostStatus('Failed to post');
    }
    setTimeout(() => setPostStatus(null), 3000);
  };

  const channelContent = digest?.channelFormats?.[activeChannel] || '';

  return (
    <div className="min-h-screen bg-gl-base flex flex-col">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lastRefresh={lastRefresh}
        sourcesOnline={sourcesOnline}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <StatsBar
        totalArticles={totalArticles}
        sourcesOnline={sourcesOnline}
        lastRefresh={lastRefresh}
        topKeywords={topKeywords}
        relevantCount={relevantCount}
      />

      <FilterBar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        timeFilter={timeFilter}
        onTimeChange={setTimeFilter}
      />

      {error && (
        <div className="px-4 md:px-6 mb-2">
          <div className="bg-gl-red/10 border border-gl-red/30 rounded-lg px-4 py-2 text-sm text-gl-red">
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 md:px-6 pb-6">
        {articles.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-gl-text-secondary">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-sm">No articles match your filter.</p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); setTimeFilter('all'); }}
              className="mt-2 text-xs text-gl-link hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {/* Channel preview and actions */}
      <div className="border-t border-[rgba(139,148,158,0.15)]">
        <ChannelPreview
          activeChannel={activeChannel}
          onChannelChange={setActiveChannel}
          content={channelContent}
        />
        <div className="px-4 md:px-6 pb-4 flex items-center gap-3">
          <button
            onClick={handlePostTelegram}
            disabled={activeChannel !== 'telegram' || postStatus === 'posting...'}
            className="px-4 py-2 bg-gl-accent-blue rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {postStatus || 'Post to Telegram'}
          </button>
          {digest?.channelFormats?.whatsapp && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(digest!.channelFormats.whatsapp);
                setPostStatus('Copied!');
                setTimeout(() => setPostStatus(null), 2000);
              }}
              className="px-4 py-2 bg-[#075E54] rounded-lg text-white text-xs font-medium hover:opacity-90 transition-all"
            >
              Copy WhatsApp Format
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
