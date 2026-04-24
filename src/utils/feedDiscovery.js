const TIMEOUT_MS = 8000;
const COMMON_PATHS = ['/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml', '/index.xml'];

async function fetchViaProxy(url, proxy) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const proxyUrl = proxy === 'allorigins'
      ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      : `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (proxy === 'allorigins') {
      const json = await res.json();
      return json.contents || '';
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function isFeedContent(text) {
  const t = (text || '').trimStart();
  return t.startsWith('<?xml') || t.startsWith('<rss') || t.startsWith('<feed') || t.includes('<channel>');
}

function extractFeedMeta(xmlText, feedUrl) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return { title: '', htmlUrl: '' };
    const isAtom = !!doc.querySelector('feed');
    if (isAtom) {
      const title = doc.querySelector('feed > title')?.textContent?.trim() || '';
      const link = doc.querySelector('feed > link[rel="alternate"]') || doc.querySelector('feed > link:not([rel])');
      const htmlUrl = link?.getAttribute('href') || '';
      return { title, htmlUrl };
    }
    const title = doc.querySelector('channel > title')?.textContent?.trim() || '';
    const htmlUrl = doc.querySelector('channel > link')?.textContent?.trim() || '';
    return { title, htmlUrl };
  } catch {
    return { title: '', htmlUrl: '' };
  }
}

function findFeedLinkInHtml(html, baseUrl) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const link =
      doc.querySelector('link[rel="alternate"][type="application/rss+xml"]') ||
      doc.querySelector('link[rel="alternate"][type="application/atom+xml"]');
    const href = link?.getAttribute('href');
    if (!href) return null;
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

export async function discoverFeed(inputUrl) {
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // Try URL as-is across both proxies
  for (const proxy of ['corsproxy', 'allorigins']) {
    try {
      const content = await fetchViaProxy(url, proxy);
      if (isFeedContent(content)) {
        const meta = extractFeedMeta(content, url);
        return { feedUrl: url, title: meta.title, htmlUrl: meta.htmlUrl };
      }
      // HTML — look for <link rel="alternate">
      const found = findFeedLinkInHtml(content, url);
      if (found) {
        try {
          const feedContent = await fetchViaProxy(found, proxy);
          const meta = extractFeedMeta(feedContent, found);
          return { feedUrl: found, title: meta.title, htmlUrl: meta.htmlUrl || url };
        } catch {
          return { feedUrl: found, title: '', htmlUrl: url };
        }
      }
      break; // got HTML but no feed link — move on to common paths
    } catch {
      // proxy failed, try next
    }
  }

  // Try common feed paths on the site origin
  try {
    const origin = new URL(url).origin;
    for (const path of COMMON_PATHS) {
      const candidate = origin + path;
      try {
        const content = await fetchViaProxy(candidate, 'corsproxy');
        if (isFeedContent(content)) {
          const meta = extractFeedMeta(content, candidate);
          return { feedUrl: candidate, title: meta.title, htmlUrl: meta.htmlUrl || url };
        }
      } catch {
        // continue
      }
    }
  } catch {
    // invalid URL
  }

  throw new Error('No feed found. Enter the direct RSS/Atom URL.');
}
