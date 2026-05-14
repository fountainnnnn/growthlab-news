import React from 'react';
import type { Article } from '../types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'AI': { bg: 'rgba(124, 92, 252, 0.15)', text: '#B392F0' },
  'SaaS': { bg: 'rgba(88, 166, 255, 0.15)', text: '#79C0FF' },
  'Funding': { bg: 'rgba(63, 185, 80, 0.15)', text: '#56D364' },
  'VC': { bg: 'rgba(210, 153, 34, 0.15)', text: '#E3B341' },
  'Startups': { bg: 'rgba(88, 166, 255, 0.15)', text: '#79C0FF' },
  'SEA': { bg: 'rgba(248, 81, 73, 0.15)', text: '#FF7B72' },
  'Singapore': { bg: 'rgba(188, 140, 255, 0.15)', text: '#D2A8FF' },
  'Product Launch': { bg: 'rgba(255, 123, 114, 0.15)', text: '#FFA198' },
  'Big Tech': { bg: 'rgba(139, 148, 158, 0.15)', text: '#C9D1D9' },
  'Fintech': { bg: 'rgba(63, 185, 80, 0.15)', text: '#56D364' },
  'E-Commerce': { bg: 'rgba(210, 153, 34, 0.15)', text: '#E3B341' },
};

const SOURCE_COLORS: Record<string, string> = {
  'E27': '#00A86B',
  'TIA': '#FF6B35',
  'DSA': '#1A73E8',
  'KRA': '#E53935',
  'SBR': '#00897B',
  'OGV': '#1565C0',
  'VPC': '#E91E63',
};

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const sourceColor = SOURCE_COLORS[article.sourceKey] || '#8B949E';

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gl-surface border border-[rgba(139,148,158,0.15)] rounded-lg p-4 card-hover"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="source-badge text-[11px] font-semibold"
          style={{
            backgroundColor: `${sourceColor}22`,
            color: sourceColor,
          }}
          title={article.source}
        >
          {article.sourceKey}
        </span>
        <span className="font-mono text-[11px] text-gl-text-tertiary">
          {formatDate(article.publishedDate)}
        </span>
      </div>

      <h3 className="text-sm font-medium text-gl-text leading-snug mb-1.5 line-clamp-2">
        {article.title}
      </h3>

      {article.summary && (
        <p className="text-xs text-gl-text-secondary leading-relaxed mb-2 line-clamp-2">
          {article.summary}
        </p>
      )}

      {article.founderSummary && (
        <p className="text-[12px] italic text-gl-accent mb-3 leading-relaxed border-l-2 border-gl-accent pl-2">
          {article.founderSummary}
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex gap-1 flex-wrap">
          {article.categories.slice(0, 3).map(cat => {
            const color = CATEGORY_COLORS[cat] || { bg: 'rgba(139,148,158,0.15)', text: '#8B949E' };
            return (
              <span
                key={cat}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {cat}
              </span>
            );
          })}
        </div>
        <div className="font-mono text-[11px] font-semibold" style={{ color: getScoreColor(article.relevanceScore) }}>
          {article.relevanceScore}
        </div>
      </div>
    </a>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m`;
  if (hours < 24) return `${hours}h`;
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#3FB950';
  if (score >= 40) return '#D29922';
  return '#8B949E';
}
