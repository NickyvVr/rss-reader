/**
 * Convert sources array to OPML XML string and trigger download.
 */
export function exportAsOPML(sources) {
  const categories = {};
  const uncategorized = [];

  for (const source of sources) {
    if (source.category) {
      if (!categories[source.category]) categories[source.category] = [];
      categories[source.category].push(source);
    } else {
      uncategorized.push(source);
    }
  }

  const escapeXml = str =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const feedLine = s =>
    `      <outline type="rss" text="${escapeXml(s.title)}" title="${escapeXml(s.title)}" xmlUrl="${escapeXml(s.xmlUrl)}" htmlUrl="${escapeXml(s.htmlUrl)}"/>`;

  const categoryBlock = (cat, feeds) =>
    `    <outline text="${escapeXml(cat)}" title="${escapeXml(cat)}">\n${feeds.map(feedLine).join('\n')}\n    </outline>`;

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="1.0">',
    '  <head>',
    `    <title>FeedlyReader Export</title>`,
    `    <dateCreated>${new Date().toUTCString()}</dateCreated>`,
    '  </head>',
    '  <body>',
    ...Object.entries(categories).map(([cat, feeds]) => categoryBlock(cat, feeds)),
    ...uncategorized.map(feedLine),
    '  </body>',
    '</opml>',
  ];

  const xml = lines.join('\n');
  const blob = new Blob([xml], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedlyreader-export-${new Date().toISOString().slice(0, 10)}.opml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
