import { useState } from 'react';
import { formatDistanceToNow } from '../utils/dateHelper';
import { ShareButtons } from './ShareButtons';

export function ArticleCard({ article, source, onMarkRead }) {
  const [expanded, setExpanded] = useState(true);

  const sourceName = source?.title || 'Unknown Source';
  const faviconUrl = source?.htmlUrl
    ? `${source.htmlUrl.replace(/\/$/, '')}/favicon.ico`
    : null;

  function markReadIfUnread() {
    if (!article.isRead) onMarkRead(article.id, true);
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
            onClick={() => setExpanded(e => !e)}
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

      {/* Title row: clicking text marks read, icon opens article */}
      <div className="flex items-start gap-2 mt-2 group">
        <span
          onClick={markReadIfUnread}
          className="flex-1 text-base font-semibold text-gray-100 leading-snug cursor-pointer group-hover:text-indigo-300 transition-colors"
        >
          {article.title}
        </span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={markReadIfUnread}
          className="shrink-0 mt-0.5 p-1 text-gray-600 hover:text-indigo-400 transition-colors rounded"
          title="Open article"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Snippet + share */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          {article.contentSnippet && (
            <p
              onClick={markReadIfUnread}
              className="text-sm text-gray-400 leading-relaxed mb-3 cursor-pointer"
            >
              {article.contentSnippet}
            </p>
          )}
          <ShareButtons article={article} sourceName={sourceName} />
        </div>
      )}
    </article>
  );
}
