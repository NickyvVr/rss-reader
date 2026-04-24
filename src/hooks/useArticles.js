import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getArticles, saveArticles } from '../utils/storage';

function hashId(sourceId, guid) {
  // Simple deterministic ID from sourceId + guid
  let str = sourceId + '|' + guid;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + str.length.toString(36);
}

export function useArticles() {
  const [articles, setArticles] = useState(() => getArticles());

  const persist = useCallback(updated => {
    saveArticles(updated);
    setArticles(updated);
  }, []);

  const mergeArticles = useCallback((sourceId, rawArticles) => {
    const existing = getArticles();
    const existingUrls = new Set(existing.map(a => a.url));
    const existingIds = new Set(existing.map(a => a.id));
    const now = new Date().toISOString();
    const newArticles = [];

    for (const raw of rawArticles) {
      if (!raw.url || existingUrls.has(raw.url)) continue;
      const id = hashId(sourceId, raw.guid || raw.url);
      if (existingIds.has(id)) continue;

      newArticles.push({
        id,
        sourceId,
        title: raw.title || 'Untitled',
        url: raw.url,
        author: raw.author || '',
        publishedAt: raw.publishedAt || now,
        contentSnippet: raw.contentSnippet || '',
        isRead: false,
        readAt: null,
        isSaved: false,
        shortSummary: null,
        longSummary: null,
        fetchedAt: now,
      });
    }

    if (newArticles.length === 0) return 0;
    const updated = [...existing, ...newArticles];
    persist(updated);
    return newArticles.length;
  }, [persist]);

  const markRead = useCallback((id, isRead = true) => {
    setArticles(prev => {
      const updated = prev.map(a =>
        a.id === id
          ? { ...a, isRead, readAt: isRead ? new Date().toISOString() : null }
          : a
      );
      saveArticles(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(ids => {
    setArticles(prev => {
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      const updated = prev.map(a =>
        idSet.has(a.id) ? { ...a, isRead: true, readAt: now } : a
      );
      saveArticles(updated);
      return updated;
    });
  }, []);

  const markReadByUrls = useCallback(urls => {
    setArticles(prev => {
      const urlSet = new Set(urls);
      const now = new Date().toISOString();
      const updated = prev.map(a =>
        urlSet.has(a.url) ? { ...a, isRead: true, readAt: now } : a
      );
      saveArticles(updated);
      return updated;
    });
  }, []);

  const toggleSaved = useCallback(id => {
    setArticles(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, isSaved: !a.isSaved } : a);
      saveArticles(updated);
      return updated;
    });
  }, []);

  const markSavedByUrls = useCallback(urls => {
    setArticles(prev => {
      const urlSet = new Set(urls);
      const updated = prev.map(a =>
        urlSet.has(a.url) ? { ...a, isSaved: true } : a
      );
      saveArticles(updated);
      return updated;
    });
  }, []);

  const updateArticle = useCallback((id, changes) => {
    setArticles(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...changes } : a);
      saveArticles(updated);
      return updated;
    });
  }, []);

  const deleteBySourceId = useCallback(sourceId => {
    setArticles(prev => {
      const updated = prev.filter(a => a.sourceId !== sourceId);
      saveArticles(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveArticles([]);
    setArticles([]);
  }, []);

  return {
    articles,
    mergeArticles,
    markRead,
    markAllRead,
    markReadByUrls,
    toggleSaved,
    markSavedByUrls,
    updateArticle,
    deleteBySourceId,
    clearAll,
  };
}
