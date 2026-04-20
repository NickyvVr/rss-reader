import { useState } from 'react';
import { AddSourceForm } from './AddSourceForm';
import { toast } from './Toast';
import { formatDistanceToNow } from '../utils/dateHelper';

export function SourcesManager({
  sources, articles, onAddSource, onUpdateSource, onDeleteSource,
  onRenameCategory, onMergeCategories, onFetchSingle, onDeleteArticlesBySource,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [keepArticles, setKeepArticles] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('');
  const [renameCat, setRenameCat] = useState(null);
  const [renameTo, setRenameTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const categories = [...new Set(sources.map(s => s.category).filter(Boolean))];

  const unreadCounts = {};
  for (const a of articles) {
    if (!a.isRead) unreadCounts[a.sourceId] = (unreadCounts[a.sourceId] || 0) + 1;
  }
  const articleCounts = {};
  for (const a of articles) {
    articleCounts[a.sourceId] = (articleCounts[a.sourceId] || 0) + 1;
  }

  const filtered = sources.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.xmlUrl.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  for (const s of filtered) {
    const cat = s.category || '';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  function startEdit(source) {
    setEditId(source.id);
    setEditName(source.title);
    setEditCat(source.category || '');
  }

  function saveEdit(id) {
    onUpdateSource(id, { title: editName, category: editCat });
    setEditId(null);
    toast('Source updated');
  }

  function confirmDelete(id) {
    const source = sources.find(s => s.id === id);
    if (!keepArticles) onDeleteArticlesBySource(id);
    onDeleteSource(id);
    setDeleteId(null);
    toast(`Deleted "${source?.title}"`);
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} selected feeds?`)) return;
    for (const id of selected) {
      onDeleteArticlesBySource(id);
      onDeleteSource(id);
    }
    setSelected(new Set());
    toast(`Deleted ${selected.size} feeds`);
  }

  function bulkToggleActive(active) {
    for (const id of selected) {
      onUpdateSource(id, { active });
    }
    setSelected(new Set());
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Manage Sources</h1>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <>
              <button onClick={() => bulkToggleActive(true)} className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                Enable selected
              </button>
              <button onClick={() => bulkToggleActive(false)} className="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                Disable selected
              </button>
              <button onClick={bulkDelete} className="text-sm px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">
                Delete {selected.size}
              </button>
            </>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + Add Feed
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sources…"
          className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {Object.entries(grouped).map(([cat, catSources]) => (
        <div key={cat || '__none__'} className="mb-6">
          {/* Category header */}
          <div className="flex items-center gap-3 mb-2">
            {cat ? (
              renameCat === cat ? (
                <div className="flex items-center gap-2">
                  <input
                    value={renameTo}
                    onChange={e => setRenameTo(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  />
                  <button onClick={() => { onRenameCategory(cat, renameTo); setRenameCat(null); toast('Category renamed'); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300">Save</button>
                  <button onClick={() => setRenameCat(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-300">{cat}</h3>
                  <button
                    onClick={() => { setRenameCat(cat); setRenameTo(cat); }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    rename
                  </button>
                </>
              )
            ) : (
              <h3 className="text-sm font-semibold text-gray-500">Uncategorized</h3>
            )}
          </div>

          <div className="border border-gray-800 rounded-lg overflow-hidden">
            {catSources.map((source, idx) => (
              <div
                key={source.id}
                className={`flex items-center gap-3 px-4 py-3 text-sm
                  ${idx < catSources.length - 1 ? 'border-b border-gray-800' : ''}
                  ${source.active ? 'bg-gray-900/40' : 'bg-gray-900/20 opacity-60'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(source.id)}
                  onChange={() => toggleSelect(source.id)}
                  className="rounded text-indigo-600"
                />

                {editId === source.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-1"
                    />
                    <input
                      value={editCat}
                      onChange={e => setEditCat(e.target.value)}
                      placeholder="Category"
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-32"
                    />
                    <button onClick={() => saveEdit(source.id)} className="text-xs text-indigo-400 hover:text-indigo-300">Save</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-500">Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-200 truncate">{source.title}</div>
                      <div className="text-xs text-gray-500 truncate">{source.xmlUrl}</div>
                    </div>

                    <div className="shrink-0 text-xs text-gray-500 text-right">
                      <div>{unreadCounts[source.id] ? <span className="text-indigo-400">{unreadCounts[source.id]} unread</span> : null}</div>
                      <div>{articleCounts[source.id] || 0} total</div>
                    </div>

                    {source.lastFetchedAt && (
                      <div className="shrink-0 text-xs text-gray-600">{formatDistanceToNow(source.lastFetchedAt)}</div>
                    )}

                    {source.lastError && (
                      <span className="text-xs text-red-400 shrink-0" title={source.lastError}>Error</span>
                    )}

                    {/* Active toggle */}
                    <button
                      onClick={() => onUpdateSource(source.id, { active: !source.active })}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors
                        ${source.active ? 'bg-indigo-600' : 'bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transform transition-transform
                        ${source.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>

                    <button onClick={() => startEdit(source)} className="text-gray-500 hover:text-gray-300 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button onClick={() => setDeleteId(source.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {sources.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No feeds added yet.</p>
          <p className="text-sm mt-2">Import an OPML file or add feeds manually.</p>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (() => {
        const src = sources.find(s => s.id === deleteId);
        const count = articleCounts[deleteId] || 0;
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl p-6">
              <h3 className="text-white font-semibold mb-3">Delete "{src?.title}"?</h3>
              <p className="text-gray-400 text-sm mb-4">
                This will also remove all {count} cached articles for this source.
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-300 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepArticles}
                  onChange={e => setKeepArticles(e.target.checked)}
                  className="rounded"
                />
                Keep articles, just remove source
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => confirmDelete(deleteId)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showAdd && (
        <AddSourceForm
          sources={sources}
          onAddSource={onAddSource}
          onFetchSingle={onFetchSingle}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
