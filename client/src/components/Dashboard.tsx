import React from 'react';
import type { TimeFilter } from './types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lastRefresh: string | null;
  sourcesOnline: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function TopBar({ searchQuery, onSearchChange, lastRefresh, sourcesOnline, onRefresh, isRefreshing }: TopBarProps) {
  return (
    <header className="bg-gl-surface border-b border-[rgba(139,148,158,0.15)] px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gl-accent flex items-center justify-center text-white font-bold text-sm">G</div>
          <div>
            <h1 className="text-base font-semibold text-gl-text leading-tight">GrowthLab Intelligence</h1>
            <p className="text-[11px] text-gl-text-secondary">Daily Startup News for SEA Founders</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gl-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-gl-inset border border-[rgba(139,148,158,0.15)] rounded-lg pl-9 pr-3 py-2 text-sm text-gl-text placeholder-gl-text-tertiary focus:outline-none focus:border-gl-accent focus:ring-1 focus:ring-gl-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${sourcesOnline > 0 ? 'bg-gl-green' : 'bg-gl-red'} animate-pulse`} />
            <span className="text-xs text-gl-text-secondary font-mono">{sourcesOnline} online</span>
          </div>
          {lastRefresh && (
            <span className="text-xs text-gl-text-tertiary font-mono">
              {formatTimeAgo(lastRefresh)}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gl-accent rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface StatsBarProps {
  totalArticles: number;
  sourcesOnline: number;
  lastRefresh: string | null;
  topKeywords: string[];
  relevantCount: number;
}

export function StatsBar({ totalArticles, sourcesOnline, lastRefresh, topKeywords, relevantCount }: StatsBarProps) {
  return (
    <div className="px-4 md:px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gl-surface rounded-lg border border-[rgba(139,148,158,0.15)] p-3">
        <div className="stat-value text-gl-accent-blue">{totalArticles}</div>
        <div className="stat-label">Articles Fetched</div>
      </div>
      <div className="bg-gl-surface rounded-lg border border-[rgba(139,148,158,0.15)] p-3">
        <div className="stat-value text-gl-green">{sourcesOnline}</div>
        <div className="stat-label">Sources Online</div>
      </div>
      <div className="bg-gl-surface rounded-lg border border-[rgba(139,148,158,0.15)] p-3">
        <div className="stat-value text-gl-orange">{relevantCount}</div>
        <div className="stat-label">Relevant Articles</div>
      </div>
      <div className="bg-gl-surface rounded-lg border border-[rgba(139,148,158,0.15)] p-3">
        <div className="stat-value text-gl-accent text-sm font-sans truncate">{topKeywords[0] || '-'}</div>
        <div className="stat-label">Top Keyword</div>
      </div>
    </div>
  );
}

const CATEGORIES = ['All', 'AI', 'SaaS', 'Funding', 'VC', 'Startups', 'Product Launch', 'Big Tech'];
const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7 days' },
];

interface FilterBarProps {
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  timeFilter: TimeFilter;
  onTimeChange: (t: TimeFilter) => void;
}

export function FilterBar({ activeCategory, onCategoryChange, timeFilter, onTimeChange }: FilterBarProps) {
  return (
    <div className="px-4 md:px-6 py-2 flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat === 'All' ? 'all' : cat.toLowerCase())}
            className={`category-pill whitespace-nowrap ${
              (activeCategory === cat.toLowerCase() || (activeCategory === 'all' && cat === 'All'))
                ? 'category-pill-active'
                : 'category-pill-inactive'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {TIME_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => onTimeChange(tf.key)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              timeFilter === tf.key
                ? 'bg-gl-accent text-white'
                : 'text-gl-text-secondary hover:text-gl-text bg-gl-elevated hover:bg-[#21262D]'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ChannelPreview removed -- moved to dedicated Telegram Publish view
