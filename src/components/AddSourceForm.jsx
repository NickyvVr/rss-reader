import { useState } from 'react';
import { toast } from './Toast';
import { discoverFeed } from '../utils/feedDiscovery';

export function AddSourceForm({ sources, onAddSource, onFetchSingle, onClose }) {
  const [feedUrl, setFeedUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [newCat, setNewCat] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const categories = [...new Set(sources.map(s => s.category).filter(Boolean))];

  async function handleSave() {
    if (!feedUrl.trim()) return;
    setError('');
    setValidating(true);

    let resolvedUrl = feedUrl.trim();
    let resolvedTitle = name.trim();
    let resolvedHtmlUrl = '';

    try {
      const found = await discoverFeed(feedUrl.trim());
      resolvedUrl = found.feedUrl;
      resolvedHtmlUrl = found.htmlUrl || '';
      if (!resolvedTitle && found.title) {
        resolvedTitle = found.title;
        setName(found.title);
      }
      if (resolvedUrl !== feedUrl.trim()) setFeedUrl(resolvedUrl);
    } catch (err) {
      setError(err.message);
      setValidating(false);
      return;
    }

    const cat = category === '__new__' ? newCat.trim() : category;

    try {
      const result = onAddSource({
        title: resolvedTitle || resolvedUrl,
        xmlUrl: resolvedUrl,
        htmlUrl: resolvedHtmlUrl,
        category: cat,
      });

      if (result.skipped) {
        setError('This feed URL already exists.');
        setValidating(false);
        return;
      }

      const fetchResult = await onFetchSingle(result.source);
      if (fetchResult.error) {
        setError(`Feed fetch failed: ${fetchResult.error}. Source was saved but may not work.`);
      } else {
        toast(`Added "${result.source.title}" — ${fetchResult.count} articles fetched`);
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Feed</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Website or feed URL *</label>
            <input
              type="url"
              value={feedUrl}
              onChange={e => setFeedUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="https://example.com or https://example.com/feed.xml"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-600 mt-1">Paste a site URL and the feed will be auto-detected.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Auto-filled from feed"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">No category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ New category…</option>
            </select>
          </div>

          {category === '__new__' && (
            <div>
              <input
                type="text"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Category name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={validating || !feedUrl.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {validating ? 'Detecting feed…' : 'Add Feed'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
