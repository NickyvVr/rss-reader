import { useMemo, useState } from 'react';
import { exportAsOPML } from '../utils/opmlExporter';
import { toast } from './Toast';
import { formatDistanceToNow } from '../utils/dateHelper';
import { SYNC_STATUS } from '../hooks/useSync';

function SyncStatusBadge({ syncStatus, lastSyncedAt, isSyncing }) {
  if (isSyncing) return <span className="text-xs text-indigo-400 animate-pulse">Syncing…</span>;
  if (syncStatus === SYNC_STATUS.SUCCESS && lastSyncedAt)
    return <span className="text-xs text-gray-500">Synced {formatDistanceToNow(lastSyncedAt)}</span>;
  if (syncStatus === SYNC_STATUS.ERROR)
    return <span className="text-xs text-red-400">Sync failed</span>;
  return null;
}

export function SettingsModal({
  settings, onSave, onClearArticles, sources, onClose,
  syncStatus, syncError, lastSyncedAt, isSyncing, onSyncNow, onConnectPat, onResetAndPull,
}) {
  const [form, setForm] = useState({ ...settings });
  const [patInput, setPatInput] = useState(settings.syncPat || '');
  const [patVisible, setPatVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    onSave(form);
    toast('Settings saved');
    onClose();
  }

  function handleClear() {
    if (!window.confirm('Clear all cached articles? Sources will be kept.')) return;
    onClearArticles();
    toast('Cached articles cleared');
  }

  function handleExport() {
    exportAsOPML(sources);
    toast('OPML export downloaded');
  }

  async function handleConnectPat() {
    const trimmed = patInput.trim();
    if (!trimmed) return;
    setConnecting(true);
    try {
      const { username, existingGistId } = await onConnectPat(trimmed);
      set('syncPat', trimmed);
      set('syncGistId', existingGistId || '');
      toast(existingGistId
        ? `Connected as @${username} — found existing sync data`
        : `Connected as @${username} — sync gist will be created on first save`
      );
    } catch (err) {
      toast(err.message || 'Connection failed', 'error');
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setPatInput('');
    set('syncPat', '');
    set('syncGistId', '');
  }

  // Merged category list: stored order first, then any new ones alphabetically
  const allCategories = useMemo(
    () => [...new Set(sources.map(s => s.category).filter(Boolean))],
    [sources]
  );
  const effectiveCatOrder = useMemo(() => {
    const stored = form.categoryOrder || [];
    return [
      ...stored.filter(c => allCategories.includes(c)),
      ...allCategories.filter(c => !stored.includes(c)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [form.categoryOrder, allCategories]);

  function moveCategory(cat, direction) {
    const list = [...effectiveCatOrder];
    const idx = list.indexOf(cat);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    set('categoryOrder', list);
  }

  const arrowBtn = 'p-0.5 text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-20';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* CORS Proxy */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CORS Proxy</label>
            <div className="space-y-2">
              {[
                { value: 'auto', label: 'Auto (recommended)', desc: 'Tries each proxy in turn. Best reliability.' },
                { value: 'rss2json', label: 'rss2json.com', desc: 'Structured JSON API. Free tier: 10k req/day.' },
                { value: 'corsproxy', label: 'corsproxy.io', desc: 'Transparent raw proxy. No known rate limit.' },
                { value: 'allorigins', label: 'allorigins.win', desc: 'Raw XML via JSON wrapper. Unlimited but slower.' },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="corsProxy"
                    value={opt.value}
                    checked={form.corsProxy === opt.value}
                    onChange={() => set('corsProxy', opt.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-gray-200">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Default view */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default View</label>
            <select
              value={form.defaultView}
              onChange={e => set('defaultView', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="unread">Unread</option>
              <option value="all">All Articles</option>
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Feed &amp; Category Order</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-700 w-fit mb-4">
              {[
                { value: 'alpha', label: 'Alphabetical' },
                { value: 'custom', label: 'Custom' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('sourceSort', opt.value)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors
                    ${form.sourceSort === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.sourceSort === 'custom' && allCategories.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Drag categories into the order you want. Source order within each category is set in Manage Sources.
                </p>
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  {effectiveCatOrder.map((cat, idx) => (
                    <div
                      key={cat}
                      className={`flex items-center gap-3 px-3 py-2 text-sm text-gray-200
                        ${idx < effectiveCatOrder.length - 1 ? 'border-b border-gray-800' : ''}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveCategory(cat, 'up')}
                          disabled={idx === 0}
                          className={arrowBtn}
                          title="Move up"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveCategory(cat, 'down')}
                          disabled={idx === effectiveCatOrder.length - 1}
                          className={arrowBtn}
                          title="Move down"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <span className="truncate">{cat}</span>
                      <span className="ml-auto text-xs text-gray-600">
                        {sources.filter(s => s.category === cat).length} feeds
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.sourceSort === 'custom' && allCategories.length === 0 && (
              <p className="text-xs text-gray-500">No categories yet — add feeds with categories first.</p>
            )}
          </div>

          {/* Cross-device sync */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-300">Cross-Device Sync</p>
              {form.syncPat && (
                <SyncStatusBadge syncStatus={syncStatus} lastSyncedAt={lastSyncedAt} isSyncing={isSyncing} />
              )}
            </div>

            {!form.syncPat ? (
              <>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sync your feeds and read state across devices using a GitHub Gist.
                  Create a Personal Access Token with the{' '}
                  <code className="text-xs bg-gray-800 px-1 rounded">gist</code> scope at{' '}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=gist&description=FeedlyReader+Sync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    github.com/settings/tokens
                  </a>.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={patVisible ? 'text' : 'password'}
                      value={patInput}
                      onChange={e => setPatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConnectPat()}
                      placeholder="github_pat_…"
                      autoComplete="off"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                                 placeholder-gray-500 focus:outline-none focus:border-indigo-500 pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPatVisible(v => !v)}
                      className="absolute right-2 top-2 p-0.5 text-gray-500 hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {patVisible ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleConnectPat}
                    disabled={connecting || !patInput.trim()}
                    className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                               text-white font-medium rounded-lg transition-colors shrink-0"
                  >
                    {connecting ? 'Checking…' : 'Connect'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Gist ID</label>
                  <input
                    type="text"
                    value={form.syncGistId || ''}
                    onChange={e => set('syncGistId', e.target.value.trim())}
                    placeholder="Paste an existing Gist ID, or leave blank to create new"
                    autoComplete="off"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                               placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="flex-1 text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600
                               disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
                  >
                    {isSyncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="text-sm px-3 py-2 bg-gray-800 hover:bg-red-900/40 border border-gray-700
                               text-gray-400 hover:text-red-300 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Replace all local sources with the remote sync data?\n\nThis removes any local-only feeds. Your read history stays intact.')) {
                      onResetAndPull();
                    }
                  }}
                  disabled={isSyncing || !form.syncGistId}
                  className="w-full text-sm px-3 py-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50
                             disabled:opacity-30 rounded-lg transition-colors text-left"
                >
                  Replace local sources with remote…
                </button>
                {syncError && (
                  <p className="text-xs text-red-400">{syncError}</p>
                )}
              </>
            )}
          </div>

          {/* Data management */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            <p className="text-sm font-medium text-gray-300">Data</p>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Clear cached articles
              </button>
              <button
                onClick={handleExport}
                className="flex-1 text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Export OPML
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
