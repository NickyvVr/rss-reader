const KEYS = {
  SOURCES: 'feedlyreader_sources',
  ARTICLES: 'feedlyreader_articles',
  SETTINGS: 'feedlyreader_settings',
};

const DEFAULTS = {
  settings: {
    corsProxy: 'rss2json',
    defaultView: 'unread',
  },
};

export function getSources() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SOURCES) || '[]');
  } catch {
    return [];
  }
}

export function saveSources(sources) {
  localStorage.setItem(KEYS.SOURCES, JSON.stringify(sources));
}

export function getArticles() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.ARTICLES) || '[]');
  } catch {
    return [];
  }
}

export function saveArticles(articles) {
  // Evict oldest read articles if storage is getting full (>4MB estimate)
  try {
    const serialized = JSON.stringify(articles);
    if (serialized.length > 4_000_000) {
      const sorted = [...articles].sort((a, b) => {
        if (a.isRead && !b.isRead) return -1;
        if (!a.isRead && b.isRead) return 1;
        return new Date(a.fetchedAt) - new Date(b.fetchedAt);
      });
      const trimmed = sorted.slice(Math.floor(sorted.length * 0.3));
      localStorage.setItem(KEYS.ARTICLES, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(KEYS.ARTICLES, serialized);
    }
  } catch {
    // If still fails, clear and save
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(articles.slice(-500)));
  }
}

export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    return { ...DEFAULTS.settings, ...stored };
  } catch {
    return { ...DEFAULTS.settings };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function clearArticles() {
  localStorage.removeItem(KEYS.ARTICLES);
}
