import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar, StatsBar, FilterBar } from './components/Dashboard';
import { ArticleCard } from './components/ArticleCard';
import { getLatestNews, triggerRefresh, getTodayDigest, postToTelegram, postCustomToTelegram, regenerateDigest } from './api';
import type { Article, Digest, TimeFilter } from './types';

type ViewMode = 'feed' | 'publish';

function App() {
  const [view, setView] = useState<ViewMode>('feed');
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
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState<string>('');

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setError(null);
      const apiCategory = activeCategory === 'all' ? undefined : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
      const data = await getLatestNews({
        category: apiCategory,
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

  useEffect(() => {
    refreshIntervalRef.current = setInterval(loadAll, 5 * 60 * 1000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [loadAll]);

  // Load telegram text into editor when switching to publish view
  useEffect(() => {
    if (view === 'publish' && digest?.channelFormats?.telegram && !customText) {
      setCustomText(digest.channelFormats.telegram);
    }
  }, [view, digest]);

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

  const handleRegenerate = async () => {
    setPostStatus('shuffling...');
    try {
      const result = await regenerateDigest();
      if (result.status === 'ok' && result.digest?.channelFormats?.telegram) {
        setCustomText(result.digest.channelFormats.telegram);
        setDigest(prev => prev ? { ...prev, channelFormats: result.digest.channelFormats, relevantCount: result.digest.relevantCount } : prev);
        setPostStatus('Shuffled!');
      } else {
        setPostStatus('Failed');
      }
    } catch {
      setPostStatus('Error');
    }
    setTimeout(() => setPostStatus(null), 2000);
  };

  const handlePostTelegram = async () => {
    setPostStatus('posting...');
    try {
      const result = customText
        ? await postCustomToTelegram(customText)
        : await postToTelegram();
      setPostStatus(result.status === 'ok' ? 'Posted!' : result.message || 'Error');
    } catch (err) {
      setPostStatus('Failed to post');
    }
    setTimeout(() => setPostStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gl-base flex flex-col">
      {/* Tab navigation */}
      <div className="bg-gl-surface border-b border-[rgba(139,148,158,0.15)] px-4 md:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 py-3">
            <div className="w-7 h-7 rounded-lg bg-gl-accent flex items-center justify-center text-white font-bold text-xs">G</div>
            <span className="text-sm font-semibold text-gl-text">GrowthLab Intelligence</span>
          </div>
          <div className="flex gap-1">
            {(['feed', 'publish'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  view === m
                    ? 'text-gl-accent border-gl-accent'
                    : 'text-gl-text-secondary border-transparent hover:text-gl-text hover:border-gl-text-tertiary'
                }`}
              >
                {m === 'feed' ? 'News Feed' : 'Telegram Publish'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'feed' ? (
        <>
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
        </>
      ) : (
        /* ─── Telegram Publish View ─── */
        <div className="flex-1 px-4 md:px-6 py-6 max-w-3xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gl-text">Telegram Publisher</h2>
            <p className="text-xs text-gl-text-secondary mt-1">Edit the message, shuffle articles, then post to your Telegram channel.</p>
          </div>

          {/* Simulated Telegram preview */}
          <div className="bg-[#17212B] rounded-xl border border-[rgba(139,148,158,0.12)] overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(139,148,158,0.1)]">
              <div className="w-5 h-5 rounded-full bg-gl-accent-blue flex items-center justify-center text-white text-[10px] font-bold">T</div>
              <span className="text-xs text-gl-text font-medium">Telegram Preview</span>
            </div>
            <div className="px-4 py-3">
              <div className="bg-[#2B5278] rounded-lg rounded-bl-sm px-3.5 py-2.5 inline-block max-w-full">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-[#E6EDF3]" style={{ wordBreak: 'break-word' }}>
                  {customText || 'No content yet. Refresh the feed first.'}
                </p>
              </div>
              <div className="mt-1 text-[10px] text-[#6E7681] font-mono">
                {new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Editable textarea */}
          <div className="bg-gl-surface rounded-lg border border-[rgba(139,148,158,0.15)] overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(139,148,158,0.1)]">
              <span className="text-xs text-gl-text-secondary font-medium">Edit Message</span>
              <span className="text-[10px] text-gl-text-tertiary font-mono">{customText.length} chars</span>
            </div>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="w-full min-h-[240px] bg-transparent border-0 p-4 text-sm leading-relaxed font-mono text-[13px] text-gl-text focus:outline-none resize-y"
              placeholder="Edit your message here..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 bg-gl-elevated border border-[rgba(139,148,158,0.2)] rounded-lg text-xs text-gl-text font-medium hover:bg-[#21262D] transition-all"
            >
              Shuffle Articles
            </button>
            <button
              onClick={handlePostTelegram}
              disabled={!customText || postStatus === 'posting...'}
              className="px-4 py-2 bg-[#2AABEE] rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.127.037.336.02.533-.09 1.063-.766 4.27-1.082 5.666-.146.643-.433.858-.712.88-.6.049-1.065-.4-1.645-.78-.402-.262-.677-.428-1.095-.687-.473-.293-.166-.453.104-.718.063-.061.458-.44.898-.831.17-.151.331-.31.36-.375a.405.405 0 00-.017-.349.438.438 0 00-.348-.2c-.175-.003-.417.06-.665.12-.359.085-1.048.337-1.493.497-.2.074-.382.11-.476.086a.54.54 0 01-.318-.24c-.242-.444-.443-.8-.477-.843-.3-.38-.448-.395-.707-.357-.149.02-.299.11-.446.219-.2.145-.428.472-.403.716.02.163.137.329.278.428.081.057.102.09.134.145a.164.164 0 01.008.083c-.024.063-.61.812-.83 1.106-.053.07-.108.132-.162.186-.184.183-.377.251-.54.237a.376.376 0 01-.23-.14c-.298-.384-.58-.783-.825-1.22-.157-.28-.268-.492-.302-.62-.08-.298.025-.48.232-.618.273-.181 1.044-.464 1.565-.621.289-.087.62-.166.877-.241.95-.28 1.134-.344 1.342-.422.582-.22.775-.89.324-1.307-.03-.027-.068-.049-.108-.07-.236-.123-1.047-.639-1.5-.85-.242-.114-.52-.22-.788-.29-.338-.089-.645-.03-.882.066z"/>
              </svg>
              {postStatus || 'Post to Telegram'}
            </button>
            {postStatus && (
              <span className={`text-xs ${
                postStatus.includes('Posted') || postStatus.includes('Shuffled')
                  ? 'text-gl-green' : 'text-gl-orange'
              }`}>
                {postStatus}
              </span>
            )}
          </div>

          {/* Post history hint */}
          <div className="mt-8 pt-4 border-t border-[rgba(139,148,158,0.1)]">
            <p className="text-[11px] text-gl-text-tertiary">
              Posts go to the configured Telegram chat ID via your bot. Edit freely before posting -- what you see in the textarea is what gets sent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
