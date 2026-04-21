import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getSources, saveSources,
  getDeletedSourceIds, addDeletedSourceId, saveDeletedSourceIds,
} from '../utils/storage';

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
    addDeletedSourceId(id);
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

  // Move `fromId` to just before `targetId` within the same category
  const moveSourceBefore = useCallback((fromId, targetId) => {
    if (fromId === targetId) return;
    const existing = getSources();
    const from = existing.find(s => s.id === fromId);
    const target = existing.find(s => s.id === targetId);
    if (!from || !target || from.category !== target.category) return;
    const without = existing.filter(s => s.id !== fromId);
    const insertIdx = without.findIndex(s => s.id === targetId);
    without.splice(insertIdx, 0, from);
    persist(without);
  }, [persist]);

  // Full sync merge: handles deletions, updates, additions, and ordering
  const syncSources = useCallback((remoteSources, remoteDeletedIds = []) => {
    const existing = getSources();
    const localDeletedIds = getDeletedSourceIds();

    // Merge tombstone lists
    const allDeletedSet = new Set([...localDeletedIds, ...remoteDeletedIds]);
    if (allDeletedSet.size > localDeletedIds.length) {
      saveDeletedSourceIds([...allDeletedSet]);
    }

    // Find which local sources are newly tombstoned by remote
    const removedIds = existing
      .filter(s => allDeletedSet.has(s.id))
      .map(s => s.id);

    // Remove tombstoned sources locally
    const surviving = existing.filter(s => !allDeletedSet.has(s.id));
    const localByUrl = new Map(surviving.map(s => [s.xmlUrl, s]));

    // Process remote sources: update metadata on existing, add new ones
    for (const rs of remoteSources) {
      if (allDeletedSet.has(rs.id)) continue;
      if (localByUrl.has(rs.xmlUrl)) {
        const local = localByUrl.get(rs.xmlUrl);
        localByUrl.set(rs.xmlUrl, {
          ...local,
          title: rs.title,
          category: rs.category,
          htmlUrl: rs.htmlUrl,
          active: rs.active,
        });
      } else {
        // New source — preserve remote ID for article hash consistency
        localByUrl.set(rs.xmlUrl, { ...rs, lastError: null, lastFetchedAt: null });
      }
    }

    // Order: follow remote order first, then local-only sources at end
    const remoteActive = remoteSources.filter(rs => !allDeletedSet.has(rs.id));
    const remoteUrlSet = new Set(remoteActive.map(rs => rs.xmlUrl));
    const localOnly = surviving.filter(s => !remoteUrlSet.has(s.xmlUrl));
    const ordered = [
      ...remoteActive.map(rs => localByUrl.get(rs.xmlUrl)).filter(Boolean),
      ...localOnly,
    ];

    persist(ordered);
    const addedCount = ordered.filter(s => !existing.some(e => e.xmlUrl === s.xmlUrl)).length;
    return { removedIds, addedCount };
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
    syncSources,
    updateSource,
    deleteSource,
    renameCategory,
    mergeCategories,
    setSourceError,
    setSourceFetched,
    moveSourceBefore,
  };
}
