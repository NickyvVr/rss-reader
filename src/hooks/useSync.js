import { useState, useEffect, useRef, useCallback } from 'react';
import {
  validatePat, findExistingSyncGist, fetchGist, createGist, updateGist, GistApiError,
} from '../utils/gistApi';

export const SYNC_STATUS = {
  IDLE: 'idle',
  PULLING: 'pulling',
  PUSHING: 'pushing',
  SUCCESS: 'success',
  ERROR: 'error',
  NO_PAT: 'no_pat',
};

function friendlySyncError(err) {
  if (err instanceof GistApiError) {
    if (err.status === 401) return 'Invalid or expired GitHub token';
    if (err.status === 403) return 'Token lacks gist permission';
    if (err.status === 404) return 'Sync gist not found — re-link in Settings';
    if (err.status >= 500) return 'GitHub is temporarily unavailable';
    return err.message;
  }
  if (err?.message?.includes('fetch')) return 'Network error — check your connection';
  return err?.message || 'Unknown sync error';
}

export function useSync({
  sources,
  articles,
  settings,
  onMergeSources,
  onMergeReadIds,
  onMergeSettings,
  onSaveSettings,
}) {
  const [syncStatus, setSyncStatus] = useState(
    settings.syncPat ? SYNC_STATUS.IDLE : SYNC_STATUS.NO_PAT
  );
  const [syncError, setSyncError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(settings.lastSyncedAt ?? null);
  const pushTimerRef = useRef(null);
  const isMounted = useRef(true);

  // Keep a ref to latest values so async callbacks don't close over stale state
  const ref = useRef({});
  ref.current = { sources, articles, settings, onMergeSources, onMergeReadIds, onMergeSettings, onSaveSettings };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  function buildPayload() {
    const { sources, articles, settings } = ref.current;
    const cleanSources = sources.map(({ lastError: _e, lastFetchedAt: _f, ...rest }) => rest);
    const readIds = articles.filter(a => a.isRead).map(a => a.id);
    const { syncPat: _p, syncGistId: _g, lastSyncedAt: _s, ...syncableSettings } = settings;
    return { version: 1, syncedAt: new Date().toISOString(), sources: cleanSources, readIds, settings: syncableSettings };
  }

  const pullAndMerge = useCallback(async () => {
    const { settings, sources, articles, onMergeSources, onMergeReadIds, onMergeSettings, onSaveSettings } = ref.current;
    if (!settings.syncPat || !settings.syncGistId) return;

    setSyncStatus(SYNC_STATUS.PULLING);
    setSyncError(null);
    try {
      const remote = await fetchGist(settings.syncPat, settings.syncGistId);
      if (!isMounted.current) return;

      // Merge sources (additive, ID-preserving)
      const localUrls = new Set(sources.map(s => s.xmlUrl));
      const newSources = (remote.sources ?? []).filter(rs => !localUrls.has(rs.xmlUrl));
      if (newSources.length > 0) onMergeSources(newSources);

      // Merge read IDs (union)
      const localReadSet = new Set(articles.filter(a => a.isRead).map(a => a.id));
      const newReadIds = (remote.readIds ?? []).filter(id => !localReadSet.has(id));
      if (newReadIds.length > 0) onMergeReadIds(newReadIds);

      // Merge settings (last-write-wins by syncedAt)
      const { lastSyncedAt: prevSync } = settings;
      if (!prevSync || new Date(remote.syncedAt) > new Date(prevSync)) {
        const { syncPat: _p, syncGistId: _g, lastSyncedAt: _s, ...remoteSettings } = remote.settings ?? {};
        onMergeSettings({ ...settings, ...remoteSettings });
      }

      const now = new Date().toISOString();
      if (isMounted.current) {
        setLastSyncedAt(now);
        setSyncStatus(SYNC_STATUS.SUCCESS);
      }
      onSaveSettings({ ...settings, lastSyncedAt: now });
    } catch (err) {
      if (!isMounted.current) return;
      setSyncError(friendlySyncError(err));
      setSyncStatus(SYNC_STATUS.ERROR);
    }
  }, []);

  const pushToGist = useCallback(async () => {
    const { settings, onSaveSettings } = ref.current;
    if (!settings.syncPat) return;

    setSyncStatus(SYNC_STATUS.PUSHING);
    setSyncError(null);
    try {
      const payload = buildPayload();
      let gistId = settings.syncGistId;
      if (!gistId) {
        gistId = await createGist(settings.syncPat, payload);
      } else {
        await updateGist(settings.syncPat, gistId, payload);
      }
      if (!isMounted.current) return;
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      setSyncStatus(SYNC_STATUS.SUCCESS);
      onSaveSettings({ ...ref.current.settings, syncGistId: gistId, lastSyncedAt: now });
    } catch (err) {
      if (!isMounted.current) return;
      setSyncError(friendlySyncError(err));
      setSyncStatus(SYNC_STATUS.ERROR);
    }
  }, []);

  // Pull on startup if credentials exist
  useEffect(() => {
    if (settings.syncPat && settings.syncGistId) {
      const t = setTimeout(pullAndMerge, 1500);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSync = useCallback(() => {
    if (!ref.current.settings.syncPat) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(pushToGist, 3000);
  }, [pushToGist]);

  const syncNow = useCallback(async () => {
    await pullAndMerge();
    await pushToGist();
  }, [pullAndMerge, pushToGist]);

  // Expose validatePat + findExistingSyncGist for use in SettingsModal
  const connectPat = useCallback(async (pat) => {
    const username = await validatePat(pat);
    const existingGistId = await findExistingSyncGist(pat);
    return { username, existingGistId };
  }, []);

  return {
    syncStatus,
    syncError,
    lastSyncedAt,
    isSyncing: syncStatus === SYNC_STATUS.PULLING || syncStatus === SYNC_STATUS.PUSHING,
    triggerSync,
    syncNow,
    connectPat,
  };
}
