import { useState } from 'react';
import { exportAsOPML } from '../utils/opmlExporter';
import { toast } from './Toast';

export function SettingsModal({ settings, onSave, onClearArticles, sources, onClose }) {
  const [form, setForm] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);

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
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Anthropic API Key
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-indigo-400 hover:underline text-xs"
              >
                Get key →
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.anthropicApiKey}
                onChange={e => set('anthropicApiKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 pr-10"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-200"
              >
                {showKey ? (
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
            <p className="text-xs text-gray-500 mt-1">Stored in localStorage. Never sent to our servers.</p>
          </div>

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

          {/* Auto mark read */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('autoMarkReadOnExpand', !form.autoMarkReadOnExpand)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer
                  ${form.autoMarkReadOnExpand ? 'bg-indigo-600' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                  ${form.autoMarkReadOnExpand ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-gray-300">Auto-mark as read when expanding a card</span>
            </label>
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
