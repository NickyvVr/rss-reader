/**
 * Parse OPML XML text into an array of source objects.
 * Handles nested outlines where parent outline has no xmlUrl (= category).
 */
export function parseOPML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid OPML file: ' + parseError.textContent.slice(0, 100));
  }

  const body = doc.querySelector('body');
  if (!body) throw new Error('OPML file has no <body> element');

  const sources = [];

  function processOutline(outline, categoryName = '') {
    const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('xmlurl');
    const title = outline.getAttribute('title') || outline.getAttribute('text') || 'Untitled';
    const htmlUrl = outline.getAttribute('htmlUrl') || outline.getAttribute('htmlurl') || '';
    const type = outline.getAttribute('type') || '';

    if (xmlUrl) {
      // This is a feed
      sources.push({
        title,
        xmlUrl,
        htmlUrl,
        category: categoryName,
        type,
      });
    } else {
      // This is a category container
      const childCategory = title;
      const children = outline.querySelectorAll(':scope > outline');
      children.forEach(child => processOutline(child, childCategory));
    }
  }

  const topLevelOutlines = body.querySelectorAll(':scope > outline');
  topLevelOutlines.forEach(outline => processOutline(outline, ''));

  return sources;
}
