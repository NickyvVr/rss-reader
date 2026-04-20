function inferHashtags(title, sourceName) {
  const words = (title + ' ' + sourceName)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4);
  const stopWords = new Set(['about', 'after', 'where', 'their', 'there', 'which', 'these', 'those', 'would', 'could', 'should', 'other', 'being', 'since', 'still', 'under', 'until', 'while']);
  const tags = words.filter(w => !stopWords.has(w)).slice(0, 2);
  return tags.map(t => '#' + t.charAt(0).toUpperCase() + t.slice(1));
}

export function buildLinkedInMessage(article, sourceName) {
  const hashtags = inferHashtags(article.title, sourceName).join(' ');
  const author = article.author ? `by ${article.author} ` : '';
  return `Just read: ${article.title} ${author}(${sourceName})

${article.shortSummary || ''}

🔗 ${article.url}

${hashtags}`;
}

export function buildLinkedInShareUrl(url) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function buildTwitterUrl(article, sourceName) {
  const oneSentence = article.shortSummary
    ? article.shortSummary.split('.')[0] + '.'
    : '';

  let text = `📖 ${article.title} — ${sourceName}\n\n${oneSentence}\n\n🔗 ${article.url}`;

  // Truncate to 280 chars
  if (text.length > 280) {
    const overhead = `📖  — ${sourceName}\n\n${oneSentence}\n\n🔗 ${article.url}`.length;
    const available = 280 - overhead - 3;
    const shortTitle = article.title.slice(0, available) + '...';
    text = `📖 ${shortTitle} — ${sourceName}\n\n${oneSentence}\n\n🔗 ${article.url}`;
    if (text.length > 280) text = text.slice(0, 277) + '...';
  }

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function buildTeamsMessage(article, sourceName) {
  const author = article.author ? ` · ${article.author}` : '';
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString()
    : '';
  return `**${article.title}** — ${sourceName}
(${[author.replace(' · ', ''), date].filter(Boolean).join(' · ')})

${article.shortSummary || ''}

🔗 ${article.url}`;
}
