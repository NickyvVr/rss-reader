import { useState, useCallback } from 'react';
import { parseRSSOrAtom } from '../utils/rssParser';

const CONCURRENCY = 3;
const TIMEOUT_MS = 25000;
const BATCH_DELAY_MS = 300;

function buildProxyUrl(feedUrl, proxy) {
  if (proxy === 'allorigins') {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
  }
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
}

function friendlyError(err) {
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'Timed out';
  const msg = err.message || '';
  if (msg.includes('429') || msg.toLowerCase().includes('limit')) return 'Rate limited';
  if (msg.startsWith('HTTP ')) return `Server error (${msg.replace('HTTP ', '')})`;
  return msg || 'Fetch failed';
}

async function fetchFeedRaw(feedUrl, proxy) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), TIMEOUT_MS);

  try {
    const proxyUrl = buildProxyUrl(feedUrl, proxy);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if (proxy === 'allorigins') {
      const json = await response.json();
      if (!json.contents) throw new Error('Empty response');
      return json.contents;
    }

    const json = await response.json();
    if (json.status !== 'ok') throw new Error(json.message || 'rss2json error');
    return { rss2jsonData: json };
  } finally {
    clearTimeout(timer);
  }
}

// One retry with a short back-off on timeout/network errors
async function fetchFeedWithRetry(feedUrl, proxy) {
  try {
    return await fetchFeedRaw(feedUrl, proxy);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message === 'Failed to fetch') {
      await new Promise(r => setTimeout(r, 1500));
      return fetchFeedRaw(feedUrl, proxy);
    }
    throw err;
  }
}

function rss2jsonToArticles(data, sourceFallbackTitle) {
  const feed = data.rss2jsonData;
  return (feed.items || []).map(item => {
    const author = item.author || sourceFallbackTitle || '';
    const contentSnippet = stripHtml(item.description || item.content || '').slice(0, 1000);
    return {
      title: item.title || 'Untitled',
      url: item.link || '',
      author,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      contentSnippet,
      guid: item.guid || item.link || item.title,
    };
  });
}

function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

export function useFeed({ proxy = 'rss2json', onMergeArticles, onSourceError, onSourceFetched }) {
  const [fetching, setFetching] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const fetchSource = useCallback(async (source) => {
    try {
      const raw = await fetchFeedWithRetry(source.xmlUrl, proxy);
      const articles = raw?.rss2jsonData
        ? rss2jsonToArticles(raw, source.title)
        : parseRSSOrAtom(raw, source.id, source.title);
      onMergeArticles(source.id, articles);
      onSourceFetched(source.id);
      return { sourceId: source.id, error: null };
    } catch (err) {
      const msg = friendlyError(err);
      onSourceError(source.id, msg);
      return { sourceId: source.id, error: msg };
    }
  }, [proxy, onMergeArticles, onSourceError, onSourceFetched]);

  const fetchAll = useCallback(async (sources) => {
    const active = sources.filter(s => s.active);
    if (active.length === 0) return;

    setFetching(true);
    setProgress({ done: 0, total: active.length });

    for (let i = 0; i < active.length; i += CONCURRENCY) {
      const batch = active.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(s => fetchSource(s)));
      setProgress(p => ({ ...p, done: Math.min(p.done + batch.length, active.length) }));
      if (i + CONCURRENCY < active.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    setFetching(false);
    setLastRefreshed(new Date());
  }, [fetchSource]);

  const fetchSingle = useCallback(async (source) => {
    const result = await fetchSource(source);
    setLastRefreshed(new Date());
    return result;
  }, [fetchSource]);

  return { fetching, lastRefreshed, progress, fetchAll, fetchSingle };
}
