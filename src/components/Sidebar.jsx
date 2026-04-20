import { useMemo } from 'react';

export function Sidebar({ sources, articles, currentView, onViewChange, collapsed, onToggle }) {
  const unreadAll = useMemo(() => articles.filter(a => !a.isRead).length, [articles]);

  const categories = useMemo(() => {
    const cats = {};
    for (const source of sources) {
      const cat = source.category || '';
      if (!cats[cat]) cats[cat] = { sources: [], unread: 0 };
      cats[cat].sources.push(source);
    }
    for (const cat of Object.keys(cats)) {
      const sourceIds = new Set(cats[cat].sources.map(s => s.id));
      cats[cat].unread = articles.filter(a => !a.isRead && sourceIds.has(a.sourceId)).length;
    }
    return cats;
  }, [sources, articles]);

  const sourceUnread = useMemo(() => {
    const map = {};
    for (const a of articles) {
      if (!a.isRead) map[a.sourceId] = (map[a.sourceId] || 0) + 1;
    }
    return map;
  }, [articles]);

  const navItem = (view, label, count, indent = false) => {
    const active = currentView === view;
    return (
      <button
        key={view}
        onClick={() => onViewChange(view)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors
          ${indent ? 'pl-6' : ''}
          ${active
            ? 'bg-indigo-600/20 text-indigo-300 font-medium'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
      >
        <span className="truncate">{label}</span>
        {count > 0 && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0
            ${active ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r border-gray-800 flex flex-col items-center py-4 gap-3 shrink-0">
        <button
          onClick={onToggle}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-gray-800 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <span className="font-bold text-white text-sm tracking-wide">FeedlyReader</span>
        <button
          onClick={onToggle}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItem('unread', 'All Unread', unreadAll)}
        {navItem('all', 'All Articles', 0)}

        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feeds</span>
        </div>

        {Object.entries(categories).map(([cat, { sources: catSources, unread }]) => (
          <div key={cat || '__uncategorized__'}>
            {cat && (
              <button
                onClick={() => onViewChange(`cat:${cat}`)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors
                  ${currentView === `cat:${cat}`
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
              >
                <span className="truncate font-medium">{cat}</span>
                {unread > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300 font-medium shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            )}
            {catSources.map(source => {
              const view = `source:${source.id}`;
              const unreadCount = sourceUnread[source.id] || 0;
              const active = currentView === view;
              return (
                <button
                  key={source.id}
                  onClick={() => onViewChange(view)}
                  className={`w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs transition-colors
                    ${cat ? 'pl-6' : ''}
                    ${active
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : source.active
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800'
                    }`}
                >
                  {source.htmlUrl && (
                    <img
                      src={`${source.htmlUrl.replace(/\/$/, '')}/favicon.ico`}
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      onError={e => { e.target.style.display = 'none'; }}
                      alt=""
                    />
                  )}
                  <span className="truncate flex-1 text-left">{source.title}</span>
                  {source.lastError && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title={source.lastError} />
                  )}
                  {unreadCount > 0 && !source.lastError && (
                    <span className="text-xs text-gray-500 shrink-0">{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-800 space-y-0.5">
        {navItem('sources', 'Manage Sources', 0)}
        {navItem('settings', 'Settings', 0)}
      </div>
    </div>
  );
}
