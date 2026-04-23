import { useState, useEffect, useRef, useCallback } from 'react';
import {
  validatePat, findExistingSyncGist, fetchGist, createGist, updateGist, GistApiError,
} from '../utils/gistApi';
import { getDeletedSourceIds } from '../utils/storage';

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
    if (err.status === 403) return err.message || 'Token lacks gist permission — regenerate with the gist scope';
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
  onSyncSources,
  onMergeReadUrls,
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
  ref.current = { sources, articles, settings, onSyncSources, onMergeReadUrls, onMergeSettings, onSaveSettings };

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
    const readUrls = articles.filter(a => a.isRead).map(a => a.url);
    const deletedSourceIds = getDeletedSourceIds();
    const { syncPat: _p, syncGistId: _g, lastSyncedAt: _s, ...syncableSettings } = settings;
    return {
      version: 1,
      syncedAt: new Date().toISOString(),
      sources: cleanSources,
      deletedSourceIds,
      readUrls,
      settings: syncableSettings,
    };
  }

  const pullAndMerge = useCallback(async () => {
    const { settings, articles, onSyncSources, onMergeReadUrls, onMergeSettings, onSaveSettings } = ref.current;
    if (!settings.syncPat || !settings.syncGistId) return;

    setSyncStatus(SYNC_STATUS.PULLING);
    setSyncError(null);
    try {
      const remote = await fetchGist(settings.syncPat, settings.syncGistId);
      if (!isMounted.current) return;

      // Full source sync: pass lastSyncedAt so pre-sync local-only sources can be pruned
      onSyncSources(remote.sources ?? [], remote.deletedSourceIds ?? [], settings.lastSyncedAt ?? null);

      // Merge read URLs (union — once read, stays read everywhere). Fall back to readIds for
      // payloads written before this change (backward compat).
      const localReadUrls = new Set(articles.filter(a => a.isRead).map(a => a.url));
      const remoteReadUrls = remote.readUrls ?? [];
      const newReadUrls = remoteReadUrls.filter(u => u && !localReadUrls.has(u));
      if (newReadUrls.length > 0) onMergeReadUrls(newReadUrls);

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
    pullNow: pullAndMerge,
    syncNow,
    connectPat,
  };
}
