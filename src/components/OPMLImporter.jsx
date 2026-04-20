import { useState, useRef } from 'react';
import { parseOPML } from '../utils/opmlParser';
import { toast } from './Toast';

export function OPMLImporter({ onImport, onClose, isFirstRun }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const sources = parseOPML(ev.target.result);
        if (sources.length === 0) {
          setError('No feeds found in this OPML file.');
          return;
        }
        const categories = [...new Set(sources.map(s => s.category).filter(Boolean))];
        setPreview({ sources, categories });
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!preview) return;
    setImporting(true);
    const result = await onImport(preview.sources);
    setImporting(false);
    toast(`Imported ${result.added} feeds${result.skipped ? `, skipped ${result.skipped} duplicates` : ''}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Import OPML File</h2>
          {!isFirstRun && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          {isFirstRun && !preview && (
            <p className="text-gray-400 text-sm mb-4">
              Welcome to FeedlyReader! Import your Feedly OPML export to get started.
              Export it from Feedly: Settings → Integrations → Export OPML.
            </p>
          )}

          {!preview && (
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
            >
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-gray-300 font-medium">Click to select OPML file</p>
              <p className="text-gray-500 text-sm mt-1">.opml or .xml files accepted</p>
              <input ref={fileRef} type="file" accept=".opml,.xml" onChange={handleFile} className="hidden" />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {preview && (
            <div>
              <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4 mb-4">
                <p className="text-indigo-300 font-medium">
                  Found {preview.sources.length} feeds
                  {preview.categories.length > 0 && ` across ${preview.categories.length} categories`}
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
                {preview.categories.length > 0 ? (
                  preview.categories.map(cat => {
                    const catSources = preview.sources.filter(s => s.category === cat);
                    return (
                      <div key={cat} className="mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{cat}</p>
                        {catSources.map(s => (
                          <div key={s.xmlUrl} className="text-sm text-gray-300 py-0.5 pl-3">
                            {s.title}
                          </div>
                        ))}
                      </div>
                    );
                  })
                ) : (
                  preview.sources.map(s => (
                    <div key={s.xmlUrl} className="text-sm text-gray-300 py-0.5">
                      {s.title}
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={importing}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {importing ? 'Importing...' : `Import ${preview.sources.length} feeds`}
                </button>
                <button
                  onClick={() => { setPreview(null); setError(''); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
