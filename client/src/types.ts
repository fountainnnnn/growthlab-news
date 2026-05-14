export interface Article {
  id: string;
  source: string;
  sourceKey: string;
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  content: string;
  imageUrl: string | null;
  categories: string[];
  relevanceScore: number;
  founderSummary: string;
  sourceFeed: string;
}

export interface Digest {
  date: string;
  articles: Article[];
  totalArticles: number;
  relevantCount: number;
  sourcesOnline: number;
  topKeywords: string[];
  mostActiveSource: string;
  lastRefreshedAt: string;
  channelFormats: {
    whatsapp: string;
    telegram: string;
    growthlab: string;
  };
}

export interface Source {
  name: string;
  online: boolean;
  articleCount: number;
  fetchTimeMs: number;
  error: string | null;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  sourcesOnline: number;
  lastRefresh: string | null;
  articleCount: number;
}

export interface NewsResponse {
  articles: Article[];
  total: number;
  sourcesOnline: number;
  lastRefresh: string | null;
  allArticlesCount: number;
}

export interface RefreshResponse {
  status: string;
  articlesFetched?: number;
  newArticles?: number;
  relevantCount?: number;
  message?: string;
}

export type TimeFilter = 'all' | 'today' | '24h' | '7d';
