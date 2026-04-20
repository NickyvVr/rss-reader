import { useState } from 'react';

export function SummaryBlock({ article, onGenerateShort, onGenerateLong, hasApiKey }) {
  const [loadingShort, setLoadingShort] = useState(false);
  const [loadingLong, setLoadingLong] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerateShort() {
    if (!hasApiKey) return;
    setLoadingShort(true);
    setError('');
    try {
      await onGenerateShort(article);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingShort(false);
    }
  }

  async function handleGenerateLong() {
    if (!hasApiKey) return;
    setLoadingLong(true);
    setError('');
    try {
      await onGenerateLong(article);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLong(false);
    }
  }

  function renderLongSummary(text) {
    if (!text) return null;
    const parts = text.split(/Key takeaways:/i);
    const narrative = parts[0]?.trim();
    const takeaways = parts[1]?.trim();

    return (
      <div className="space-y-3">
        {narrative && <p className="text-gray-300 text-sm leading-relaxed">{narrative}</p>}
        {takeaways && (
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Key Takeaways</p>
            <ul className="space-y-1">
              {takeaways.split('\n').filter(l => l.trim()).map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-indigo-400 shrink-0">•</span>
                  <span>{line.replace(/^[-•*]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <p className="text-xs text-gray-500 mt-2">
        <span className="text-indigo-400 cursor-pointer hover:underline">Add your Anthropic API key</span> in Settings to enable AI summaries.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {error && <p className="text-xs text-red-400">{error}</p>}

      {article.shortSummary ? (
        <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-indigo-600 pl-3">
          {article.shortSummary}
        </p>
      ) : (
        <button
          onClick={handleGenerateShort}
          disabled={loadingShort}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
        >
          {loadingShort ? 'Generating summary…' : '✦ Generate summary'}
        </button>
      )}

      {article.shortSummary && !expanded && (
        <button
          onClick={() => {
            setExpanded(true);
            if (!article.longSummary) handleGenerateLong();
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Full analysis
        </button>
      )}

      {expanded && (
        <div className="mt-2 pt-3 border-t border-gray-700">
          {loadingLong ? (
            <p className="text-xs text-gray-500">Generating detailed analysis…</p>
          ) : article.longSummary ? (
            renderLongSummary(article.longSummary)
          ) : null}
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
