import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleCard } from './components/ArticleCard';
import { SourcesManager } from './components/SourcesManager';
import { SettingsModal } from './components/SettingsModal';
import { OPMLImporter } from './components/OPMLImporter';
import { ToastContainer, useToast } from './components/Toast';
import { useSources } from './hooks/useSources';
import { useArticles } from './hooks/useArticles';
import { useFeed } from './hooks/useFeed';
import { useSync } from './hooks/useSync';
import { getSettings, saveSettings } from './utils/storage';
import { formatDistanceToNow } from './utils/dateHelper';

function SkeletonCard() {
  return (
    <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/60 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-3 w-24 bg-gray-800 rounded" />
        <div className="h-3 w-16 bg-gray-800 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-gray-800 rounded mb-2" />
      <div className="h-3 w-full bg-gray-800 rounded mb-1" />
      <div className="h-3 w-2/3 bg-gray-800 rounded" />
    </div>
  );
}

export default function App() {
  const { toasts } = useToast();
  const [settings, setSettings] = useState(() => getSettings());
  const [view, setView] = useState(settings.defaultView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(settings.defaultView);
  // IDs marked read during this view session — kept visible until user navigates away
  const justReadIds = useRef(new Set());

  const {
    sources, addSource, importSources, syncSources, updateSource, deleteSource,
    renameCategory, mergeCategories, setSourceError, setSourceFetched, moveSourceBefore,
  } = useSources();

  const {
    articles, mergeArticles, markRead, markAllRead, updateArticle, deleteBySourceId, clearAll,
  } = useArticles();

  const { fetching, lastRefreshed, progress, fetchAll, fetchSingle } = useFeed({
    proxy: settings.corsProxy,
    onMergeArticles: mergeArticles,
    onSourceError: setSourceError,
    onSourceFetched: setSourceFetched,
  });

  const isSyncConfigured = !!(settings.syncPat && settings.syncGistId);
  // Don't treat empty sources as "first run" if sync is configured — let the pull populate them
  const isFirstRun = sources.length === 0 && !isSyncConfigured;

  useEffect(() => {
    if (isFirstRun) setShowImporter(true);
  }, [isFirstRun]);

  useEffect(() => {
    if (sources.length > 0) {
      fetchAll(sources);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear just-read set whenever the user navigates to a different view
  useEffect(() => {
    justReadIds.current = new Set();
  }, [view, viewMode]);

  const handleMarkRead = useCallback((id, isRead) => {
    markRead(id, isRead);
    if (isRead) justReadIds.current.add(id);
    else justReadIds.current.delete(id);
  }, [markRead]);

  const handleImport = useCallback(async (rawSources) => {
    const result = importSources(rawSources);
    setTimeout(() => fetchAll(sources.filter(s => s.active)), 100);
    return result;
  }, [importSources, sources, fetchAll]);

  const handleSaveSettings = useCallback(newSettings => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleSyncSources = useCallback((remoteSources, remoteDeletedIds) => {
    const { removedIds, addedCount } = syncSources(remoteSources, remoteDeletedIds);
    removedIds.forEach(id => deleteBySourceId(id));
    if (addedCount > 0) {
      setTimeout(() => fetchAll(sources.filter(s => s.active)), 500);
    }
  }, [syncSources, deleteBySourceId, sources, fetchAll]);

  const handleMergeReadIds = useCallback((remoteReadIds) => {
    markAllRead(remoteReadIds);
  }, [markAllRead]);

  const handleMergeSettings = useCallback((mergedSettings) => {
    setSettings(mergedSettings);
    saveSettings(mergedSettings);
  }, []);

  const { syncStatus, syncError, lastSyncedAt, isSyncing, triggerSync, pullNow, syncNow, connectPat } = useSync({
    sources,
    articles,
    settings,
    onSyncSources: handleSyncSources,
    onMergeReadIds: handleMergeReadIds,
    onMergeSettings: handleMergeSettings,
    onSaveSettings: handleSaveSettings,
  });

  // Trigger debounced push when sources or read-state change (skip first render)
  const hasMounted = useRef(false);
  const readFingerprint = useMemo(
    () => articles.filter(a => a.isRead).length,
    [articles]
  );
  useEffect(() => {
    if (!hasMounted.current) return;
    triggerSync();
  }, [sources]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasMounted.current) return;
    triggerSync();
  }, [readFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { hasMounted.current = true; }, []);

  // Pull on visibility change — when user switches back to the tab/app on phone
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') pullNow();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pullNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredArticles = useMemo(() => {
    let base = [...articles];

    if (view.startsWith('source:')) {
      const sourceId = view.replace('source:', '');
      base = base.filter(a => a.sourceId === sourceId);
    } else if (view.startsWith('cat:')) {
      const cat = view.replace('cat:', '');
      const sourceIds = new Set(sources.filter(s => s.category === cat).map(s => s.id));
      base = base.filter(a => sourceIds.has(a.sourceId));
    }

    if (viewMode === 'unread') {
      base = base.filter(a => !a.isRead || justReadIds.current.has(a.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(a => {
        const src = sources.find(s => s.id === a.sourceId);
        return (
          a.title.toLowerCase().includes(q) ||
          (a.author || '').toLowerCase().includes(q) ||
          (src?.title || '').toLowerCase().includes(q)
        );
      });
    }

    return base.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [articles, view, viewMode, search, sources]);

  const displayedUnread = useMemo(
    () => filteredArticles.filter(a => !a.isRead).length,
    [filteredArticles]
  );

  function handleMarkAllRead() {
    const unread = filteredArticles.filter(a => !a.isRead);
    if (unread.length > 10 && !window.confirm(`Mark all ${unread.length} articles as read?`)) return;
    const ids = unread.map(a => a.id);
    markAllRead(ids);
    ids.forEach(id => justReadIds.current.add(id));
  }

  function getViewTitle() {
    if (view === 'unread') return 'All Unread';
    if (view === 'all') return 'All Articles';
    if (view.startsWith('source:')) {
      const src = sources.find(s => s.id === view.replace('source:', ''));
      return src?.title || 'Feed';
    }
    if (view.startsWith('cat:')) return view.replace('cat:', '');
    return 'Articles';
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200 overflow-hidden">
      <Sidebar
        sources={sources}
        articles={articles}
        currentView={view}
        onViewChange={v => {
          if (v === 'settings') { setShowSettings(true); return; }
          setView(v);
          if (v === 'unread' || v === 'all') setViewMode(v);
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        sourceSort={settings.sourceSort}
        categoryOrder={settings.categoryOrder}
      />

      <main className="flex-1 overflow-y-auto">
        {view === 'sources' ? (
          <SourcesManager
            sources={sources}
            articles={articles}
            onAddSource={addSource}
            onUpdateSource={updateSource}
            onDeleteSource={deleteSource}
            onRenameCategory={renameCategory}
            onMergeCategories={mergeCategories}
            onFetchSingle={fetchSingle}
            onDeleteArticlesBySource={deleteBySourceId}
            sourceSort={settings.sourceSort}
            categoryOrder={settings.categoryOrder}
            onMoveSource={moveSourceBefore}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Header bar */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{getViewTitle()}</h1>
                {displayedUnread > 0 && viewMode === 'unread' && (
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full shrink-0">
                    {displayedUnread}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex rounded-lg overflow-hidden border border-gray-700">
                  {[
                    { id: 'unread', label: 'Unread' },
                    { id: 'all', label: 'All' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setViewMode(m.id)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors
                        ${viewMode === m.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {filteredArticles.some(a => !a.isRead) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1.5 hover:bg-gray-800 rounded"
                  >
                    Mark all read
                  </button>
                )}

                <button
                  onClick={() => {
                    const singleSource = view.startsWith('source:')
                      ? sources.find(s => s.id === view.replace('source:', ''))
                      : null;
                    singleSource ? fetchSingle(singleSource) : fetchAll(sources);
                  }}
                  disabled={fetching}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors disabled:opacity-40"
                  title={view.startsWith('source:') ? 'Refresh this feed' : 'Refresh all feeds'}
                >
                  <svg className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4 relative">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search articles, authors, sources…"
                className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status bar */}
            <div className="text-xs mb-3 min-h-4">
              {fetching ? (
                <span className="text-gray-600">{`Fetching feeds… ${progress.done}/${progress.total}`}</span>
              ) : (() => {
                if (view.startsWith('source:')) {
                  const src = sources.find(s => s.id === view.replace('source:', ''));
                  if (src?.lastError) return <span className="text-red-400/80">Last fetch failed: {src.lastError}</span>;
                  if (src?.lastFetchedAt) return <span className="text-gray-600">Fetched {formatDistanceToNow(src.lastFetchedAt)}</span>;
                }
                if (lastRefreshed) {
                  return <span className="text-gray-600">{`Last refreshed ${formatDistanceToNow(lastRefreshed.toISOString())} · ${lastRefreshed.toLocaleTimeString()}`}</span>;
                }
                return null;
              })()}
            </div>

            {/* Empty state */}
            {sources.length === 0 && (
              isSyncConfigured ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-sm animate-pulse">Loading feeds from sync…</p>
                  <button
                    onClick={syncNow}
                    className="mt-4 text-xs text-indigo-400 hover:underline"
                  >
                    Sync now
                  </button>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-4xl mb-4">📡</p>
                  <p className="text-gray-300 font-semibold text-lg mb-2">No feeds yet</p>
                  <p className="text-gray-500 text-sm mb-6">Import an OPML file to get started, or add feeds manually.</p>
                  <button
                    onClick={() => setShowImporter(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Import OPML
                  </button>
                </div>
              )
            )}

            {/* Article list */}
            {fetching && filteredArticles.length === 0 && sources.length > 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredArticles.length > 0 ? (
              <div className="space-y-3">
                {filteredArticles.map(article => {
                  const source = sources.find(s => s.id === article.sourceId);
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      source={source}
                      onMarkRead={handleMarkRead}
                    />
                  );
                })}
              </div>
            ) : sources.length > 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-xl mb-2">
                  {viewMode === 'unread' ? '🎉' : '🔍'}
                </p>
                <p className="font-medium text-gray-400">
                  {viewMode === 'unread' ? 'All caught up!' : 'No articles found'}
                </p>
                {viewMode === 'unread' && (
                  <button
                    onClick={() => setViewMode('all')}
                    className="text-sm text-indigo-400 hover:underline mt-2 block mx-auto"
                  >
                    View all articles
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* Import OPML floating button */}
      {!isFirstRun && (
        <button
          onClick={() => setShowImporter(true)}
          className="fixed top-4 right-4 z-40 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          Import OPML
        </button>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClearArticles={clearAll}
          sources={sources}
          onClose={() => setShowSettings(false)}
          syncStatus={syncStatus}
          syncError={syncError}
          lastSyncedAt={lastSyncedAt}
          isSyncing={isSyncing}
          onSyncNow={syncNow}
          onConnectPat={connectPat}
        />
      )}

      {showImporter && (
        <OPMLImporter
          onImport={handleImport}
          onClose={() => setShowImporter(false)}
          isFirstRun={isFirstRun}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
