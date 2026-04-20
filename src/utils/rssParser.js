/**
 * Parse RSS 2.0 or Atom 1.0 XML into an array of article objects.
 */

function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function parseDate(str) {
  if (!str) return new Date().toISOString();
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getText(el, ...tags) {
  for (const tag of tags) {
    const node = el.querySelector(tag);
    if (node) return (node.textContent || '').trim();
  }
  return '';
}

function getAttr(el, tag, attr) {
  const node = el.querySelector(tag);
  return node ? (node.getAttribute(attr) || '').trim() : '';
}

export function parseRSSOrAtom(xmlText, sourceId, sourceFallbackTitle) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('XML parse error');

  // Determine feed type
  const isAtom = !!doc.querySelector('feed');
  const articles = [];

  if (isAtom) {
    const entries = doc.querySelectorAll('entry');
    entries.forEach(entry => {
      const title = getText(entry, 'title') || 'Untitled';

      // Get article URL
      let url = '';
      const altLink = entry.querySelector('link[rel="alternate"]');
      const anyLink = entry.querySelector('link');
      if (altLink) url = altLink.getAttribute('href') || '';
      else if (anyLink) url = anyLink.getAttribute('href') || '';

      const author =
        getText(entry, 'author name') ||
        getText(entry, 'author') ||
        sourceFallbackTitle ||
        '';

      const publishedAt = parseDate(
        getText(entry, 'published') || getText(entry, 'updated')
      );

      const rawContent =
        getText(entry, 'content') ||
        getText(entry, 'summary') ||
        '';

      const contentSnippet = truncate(stripHtml(rawContent), 1000);
      const guid = getText(entry, 'id') || url || title;

      articles.push({ title, url, author, publishedAt, contentSnippet, guid });
    });
  } else {
    // RSS 2.0
    const items = doc.querySelectorAll('item');
    items.forEach(item => {
      const title = getText(item, 'title') || 'Untitled';
      const url = getText(item, 'link') || getAttr(item, 'link', 'href') || '';

      // Author: try multiple fields
      const author =
        getText(item, 'author') ||
        item.querySelector('dc\\:creator, creator')?.textContent?.trim() ||
        item.querySelector('[nodeName="dc:creator"]')?.textContent?.trim() ||
        sourceFallbackTitle ||
        '';

      const publishedAt = parseDate(
        getText(item, 'pubDate') ||
        getText(item, 'published') ||
        getText(item, 'date')
      );

      const rawContent =
        item.querySelector('content\\:encoded, encoded')?.textContent ||
        getText(item, 'description') ||
        '';

      const contentSnippet = truncate(stripHtml(rawContent), 1000);
      const guid =
        getText(item, 'guid') ||
        url ||
        title;

      articles.push({ title, url, author, publishedAt, contentSnippet, guid });
    });
  }

  return articles;
}
