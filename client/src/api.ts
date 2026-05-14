import type { Article, Digest, Source, HealthResponse, NewsResponse, RefreshResponse } from './types';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJSON<HealthResponse>(`${BASE}/health`);
}

export async function getLatestNews(params?: {
  category?: string;
  q?: string;
  time?: string;
}): Promise<NewsResponse> {
  const sp = new URLSearchParams();
  if (params?.category && params.category !== 'all') sp.set('category', params.category);
  if (params?.q) sp.set('q', params.q);
  if (params?.time && params.time !== 'all') sp.set('time', params.time);
  const qs = sp.toString();
  return fetchJSON<NewsResponse>(`${BASE}/news/latest${qs ? '?' + qs : ''}`);
}

export async function getTodayDigest(): Promise<{ digest: Digest | null; message?: string }> {
  return fetchJSON(`${BASE}/digest/today`);
}

export async function triggerRefresh(): Promise<RefreshResponse> {
  return fetchJSON(`${BASE}/refresh`, { method: 'POST' });
}

export async function postToTelegram(): Promise<{ status: string; messageId?: number; message?: string }> {
  return fetchJSON(`${BASE}/post/telegram`, { method: 'POST' });
}

export async function postCustomToTelegram(text: string): Promise<{ status: string; messageId?: number; message?: string }> {
  return fetchJSON(`${BASE}/post/telegram/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export async function regenerateDigest(): Promise<{ status: string; digest: { channelFormats: { telegram: string }; relevantCount: number } }> {
  return fetchJSON(`${BASE}/digest/regenerate`, { method: 'POST' });
}

export async function getSources(): Promise<{ sources: Source[] }> {
  return fetchJSON(`${BASE}/sources`);
}
