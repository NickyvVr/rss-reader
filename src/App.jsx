import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleCard } from './components/ArticleCard';
import { SourcesManager } from './components/SourcesManager';
import { SettingsModal } from './components/SettingsModal';
import { OPMLImporter } from './components/OPMLImporter';
import { ToastContainer, useToast } from './components/Toast';
import { useSources } from './hooks/useSources';
import { useArticles } from './hooks/useArticles';
import { useFeed } from './hooks/useFeed';
import { useSummary } from './hooks/useSummary';
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

  const {
    sources, addSource, importSources, updateSource, deleteSource,
    renameCategory, mergeCategories, setSourceError, setSourceFetched,
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

  const { generateShort, generateLong } = useSummary({
    apiKey: settings.anthropicApiKey,
    onUpdateArticle: updateArticle,
  });

  const isFirstRun = sources.length === 0;

  useEffect(() => {
    if (isFirstRun) setShowImporter(true);
  }, [isFirstRun]);

  useEffect(() => {
    if (sources.length > 0) {
      fetchAll(sources);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate short summaries for new articles
  useEffect(() => {
    if (!settings.anthropicApiKey) return;
    const pending = articles.filter(a => !a.shortSummary && a.contentSnippet);
    if (pending.length === 0) return;
    pending.slice(0, 5).forEach(a => {
      generateShort(a).catch(() => {});
    });
  }, [articles.length, settings.anthropicApiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = useCallback(async (rawSources) => {
    const result = importSources(rawSources);
    setTimeout(() => fetchAll(sources.filter(s => s.active)), 100);
    return result;
  }, [importSources, sources, fetchAll]);

  const handleSaveSettings = useCallback(newSettings => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

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
      base = base.filter(a => !a.isRead);
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
    markAllRead(unread.map(a => a.id));
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
                  onClick={() => fetchAll(sources)}
                  disabled={fetching}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors disabled:opacity-40"
                  title="Refresh feeds"
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
            <div className="text-xs text-gray-600 mb-3 h-4">
              {fetching
                ? `Fetching feeds… ${progress.done}/${progress.total}`
                : lastRefreshed
                  ? `Last refreshed ${formatDistanceToNow(lastRefreshed.toISOString())}`
                  : null
              }
            </div>

            {/* OPML import prompt */}
            {sources.length === 0 && (
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
                      onMarkRead={markRead}
                      onGenerateShort={generateShort}
                      onGenerateLong={generateLong}
                      hasApiKey={!!settings.anthropicApiKey}
                      autoMarkReadOnExpand={settings.autoMarkReadOnExpand}
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
