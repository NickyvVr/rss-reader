import { useState, useCallback, useRef } from 'react';
import { parseRSSOrAtom } from '../utils/rssParser';

const CONCURRENCY = 5;

function buildProxyUrl(feedUrl, proxy) {
  if (proxy === 'allorigins') {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
  }
  // rss2json (default)
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
}

async function fetchFeedRaw(feedUrl, proxy) {
  const proxyUrl = buildProxyUrl(feedUrl, proxy);
  const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  if (proxy === 'allorigins') {
    const json = await response.json();
    if (!json.contents) throw new Error('Empty response from allorigins');
    return json.contents;
  }

  // rss2json returns JSON with items array - but we parse the raw feed ourselves
  // Actually rss2json returns JSON, not raw XML. Use allorigins-style raw parsing
  // For rss2json we need to hit the raw endpoint differently.
  // rss2json returns structured JSON, so let's parse that instead.
  const json = await response.json();
  if (json.status !== 'ok') throw new Error(json.message || 'rss2json error');
  return { rss2jsonData: json };
}

function rss2jsonToArticles(data, sourceId, sourceFallbackTitle) {
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
  const abortRef = useRef(null);

  const fetchSource = useCallback(async (source) => {
    try {
      const raw = await fetchFeedRaw(source.xmlUrl, proxy);

      let articles;
      if (raw && raw.rss2jsonData) {
        articles = rss2jsonToArticles(raw, source.id, source.title);
      } else {
        articles = parseRSSOrAtom(raw, source.id, source.title);
      }

      const count = onMergeArticles(source.id, articles);
      onSourceFetched(source.id);
      return { sourceId: source.id, count, error: null };
    } catch (err) {
      onSourceError(source.id, err.message);
      return { sourceId: source.id, count: 0, error: err.message };
    }
  }, [proxy, onMergeArticles, onSourceError, onSourceFetched]);

  const fetchAll = useCallback(async (sources) => {
    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) return;

    setFetching(true);
    setProgress({ done: 0, total: activeSources.length });

    // Process in batches of CONCURRENCY
    const results = [];
    for (let i = 0; i < activeSources.length; i += CONCURRENCY) {
      const batch = activeSources.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(s => fetchSource(s)));
      results.push(...batchResults);
      setProgress(p => ({ ...p, done: Math.min(p.done + batch.length, activeSources.length) }));
    }

    setFetching(false);
    setLastRefreshed(new Date());
    return results;
  }, [fetchSource]);

  const fetchSingle = useCallback(async (source) => {
    setFetching(true);
    const result = await fetchSource(source);
    setFetching(false);
    setLastRefreshed(new Date());
    return result;
  }, [fetchSource]);

  return { fetching, lastRefreshed, progress, fetchAll, fetchSingle };
}
