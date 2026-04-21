import { useState } from 'react';
import { exportAsOPML } from '../utils/opmlExporter';
import { toast } from './Toast';

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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* CORS Proxy */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CORS Proxy</label>
            <div className="space-y-2">
              {[
                { value: 'rss2json', label: 'rss2json.com', desc: 'Structured JSON API. Free tier: 10k req/day.' },
                { value: 'allorigins', label: 'allorigins.win', desc: 'Returns raw XML. Unlimited but slower.' },
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

        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
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
