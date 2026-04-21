import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSources, saveSources } from '../utils/storage';

export function useSources() {
  const [sources, setSources] = useState(() => getSources());

  const persist = useCallback(updated => {
    saveSources(updated);
    setSources(updated);
  }, []);

  const addSource = useCallback(({ title, xmlUrl, htmlUrl = '', category = '', active = true }) => {
    const existing = getSources();
    const dup = existing.find(s => s.xmlUrl === xmlUrl);
    if (dup) return { skipped: true, source: dup };

    const source = {
      id: uuidv4(),
      title,
      xmlUrl,
      htmlUrl,
      category,
      addedAt: new Date().toISOString(),
      active,
    };
    const updated = [...existing, source];
    persist(updated);
    return { skipped: false, source };
  }, [persist]);

  const importSources = useCallback(rawSources => {
    const existing = getSources();
    const existingUrls = new Set(existing.map(s => s.xmlUrl));
    let added = 0;
    let skipped = 0;
    const newSources = [];

    for (const raw of rawSources) {
      if (existingUrls.has(raw.xmlUrl)) {
        skipped++;
      } else {
        newSources.push({
          id: uuidv4(),
          title: raw.title || 'Untitled',
          xmlUrl: raw.xmlUrl,
          htmlUrl: raw.htmlUrl || '',
          category: raw.category || '',
          addedAt: new Date().toISOString(),
          active: true,
        });
        added++;
        existingUrls.add(raw.xmlUrl);
      }
    }

    const updated = [...existing, ...newSources];
    persist(updated);
    return { added, skipped };
  }, [persist]);

  const updateSource = useCallback((id, changes) => {
    const existing = getSources();
    const updated = existing.map(s => s.id === id ? { ...s, ...changes } : s);
    persist(updated);
  }, [persist]);

  const deleteSource = useCallback(id => {
    const existing = getSources();
    const updated = existing.filter(s => s.id !== id);
    persist(updated);
  }, [persist]);

  const renameCategory = useCallback((oldName, newName) => {
    const existing = getSources();
    const updated = existing.map(s =>
      s.category === oldName ? { ...s, category: newName } : s
    );
    persist(updated);
  }, [persist]);

  const mergeCategories = useCallback((fromCat, toCat) => {
    const existing = getSources();
    const updated = existing.map(s =>
      s.category === fromCat ? { ...s, category: toCat } : s
    );
    persist(updated);
  }, [persist]);

  const setSourceError = useCallback((id, error) => {
    setSources(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, lastError: error, lastFetchedAt: new Date().toISOString() } : s);
      saveSources(updated);
      return updated;
    });
  }, []);

  const reorderSourceInCategory = useCallback((id, direction) => {
    const existing = getSources();
    const source = existing.find(s => s.id === id);
    if (!source) return;
    const peers = existing.filter(s => s.category === source.category);
    const peerIdx = peers.findIndex(s => s.id === id);
    const swapPeerIdx = direction === 'up' ? peerIdx - 1 : peerIdx + 1;
    if (swapPeerIdx < 0 || swapPeerIdx >= peers.length) return;
    const swapId = peers[swapPeerIdx].id;
    const updated = [...existing];
    const i = updated.findIndex(s => s.id === id);
    const j = updated.findIndex(s => s.id === swapId);
    [updated[i], updated[j]] = [updated[j], updated[i]];
    persist(updated);
  }, [persist]);

  const setSourceFetched = useCallback((id) => {
    setSources(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, lastError: null, lastFetchedAt: new Date().toISOString() } : s);
      saveSources(updated);
      return updated;
    });
  }, []);

  return {
    sources,
    addSource,
    importSources,
    updateSource,
    deleteSource,
    renameCategory,
    mergeCategories,
    setSourceError,
    setSourceFetched,
    reorderSourceInCategory,
  };
}
