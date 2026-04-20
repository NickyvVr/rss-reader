import { useState } from 'react';
import { formatDistanceToNow } from '../utils/dateHelper';
import { SummaryBlock } from './SummaryBlock';
import { ShareButtons } from './ShareButtons';

export function ArticleCard({ article, source, onMarkRead, onGenerateShort, onGenerateLong, hasApiKey, autoMarkReadOnExpand }) {
  const [expanded, setExpanded] = useState(false);

  const sourceName = source?.title || 'Unknown Source';
  const faviconUrl = source?.htmlUrl
    ? `${source.htmlUrl.replace(/\/$/, '')}/favicon.ico`
    : null;

  function handleExpand() {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded && autoMarkReadOnExpand && !article.isRead) {
      onMarkRead(article.id, true);
    }
  }

  return (
    <article
      className={`border border-gray-800 rounded-xl p-4 transition-all
        ${article.isRead ? 'opacity-60' : 'border-l-2 border-l-indigo-600'}
        hover:border-gray-700 bg-gray-900/60`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
          {faviconUrl && (
            <img
              src={faviconUrl}
              className="w-4 h-4 rounded-sm shrink-0"
              onError={e => { e.target.style.display = 'none'; }}
              alt=""
            />
          )}
          <span className="text-gray-400 truncate">{sourceName}</span>
          {article.author && (
            <>
              <span>·</span>
              <span className="truncate">{article.author}</span>
            </>
          )}
          <span>·</span>
          <span className="shrink-0">{formatDistanceToNow(article.publishedAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMarkRead(article.id, !article.isRead)}
            className={`p-1.5 rounded-md transition-colors ${
              article.isRead
                ? 'text-indigo-400 hover:text-gray-400'
                : 'text-gray-500 hover:text-indigo-400'
            }`}
            title={article.isRead ? 'Mark unread' : 'Mark as read'}
          >
            <svg className="w-4 h-4" fill={article.isRead ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={handleExpand}
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded-md transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2 text-base font-semibold text-gray-100 hover:text-indigo-300 transition-colors leading-snug"
      >
        {article.title}
      </a>

      {/* Summary */}
      <SummaryBlock
        article={article}
        onGenerateShort={onGenerateShort}
        onGenerateLong={onGenerateLong}
        hasApiKey={hasApiKey}
      />

      {/* Expanded: snippet + share */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          {article.contentSnippet && (
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              {article.contentSnippet}
            </p>
          )}
          <ShareButtons article={article} sourceName={sourceName} />
        </div>
      )}
    </article>
  );
}
