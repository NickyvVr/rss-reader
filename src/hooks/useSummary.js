import { useCallback } from 'react';

const MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(apiKey, prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

export function useSummary({ apiKey, onUpdateArticle }) {
  const generateShort = useCallback(async (article) => {
    if (!apiKey) return null;
    if (article.shortSummary) return article.shortSummary;

    const prompt = `Summarize this article in 2-3 sentences. Be direct and informative. No fluff. Title: ${article.title}. Content: ${article.contentSnippet}`;
    const summary = await callClaude(apiKey, prompt);
    onUpdateArticle(article.id, { shortSummary: summary });
    return summary;
  }, [apiKey, onUpdateArticle]);

  const generateLong = useCallback(async (article) => {
    if (!apiKey) return null;
    if (article.longSummary) return article.longSummary;

    const prompt = `Summarize this article in 6-8 sentences, then add 3-5 bullet-point key takeaways starting with 'Key takeaways:'. Title: ${article.title}. Content: ${article.contentSnippet}`;
    const summary = await callClaude(apiKey, prompt);
    onUpdateArticle(article.id, { longSummary: summary });
    return summary;
  }, [apiKey, onUpdateArticle]);

  return { generateShort, generateLong };
}
