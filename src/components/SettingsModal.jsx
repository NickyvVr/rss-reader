import { useMemo } from 'react';
import { exportAsOPML } from '../utils/opmlExporter';
import { toast } from './Toast';
import { useState } from 'react';

export function SettingsModal({ settings, onSave, onClearArticles, sources, onClose }) {
  const [form, setForm] = useState({ ...settings });

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
