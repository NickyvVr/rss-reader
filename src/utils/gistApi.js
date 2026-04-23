const GIST_FILE = 'feedlyreader-sync.json';
const GIST_DESC = 'FeedlyReader sync data — do not edit manually';
const GH_API = 'https://api.github.com';

export class GistApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GistApiError';
    this.status = status;
  }
}

function headers(pat) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function checkResponse(res) {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new GistApiError(res.status, body.message || `HTTP ${res.status}`);
}

export async function validatePat(pat) {
  const res = await fetch(`${GH_API}/user`, { headers: headers(pat) });
  if (res.status === 401) throw new GistApiError(401, 'Invalid or expired GitHub token');
  await checkResponse(res);

  // Classic tokens include X-OAuth-Scopes; check for gist early so the error
  // surfaces at connect time rather than silently on the first sync.
  const scopeHeader = res.headers.get('X-OAuth-Scopes');
  if (scopeHeader !== null) {
    const scopes = scopeHeader.split(',').map(s => s.trim());
    if (!scopes.includes('gist')) {
      throw new GistApiError(403, 'Token is missing the "gist" scope — regenerate it with gist access enabled');
    }
  }
  // Fine-grained tokens don't expose scopes in headers; let the first API call surface any permission error.

  const data = await res.json();
  return data.login;
}

export async function findExistingSyncGist(pat) {
  const res = await fetch(`${GH_API}/gists?per_page=100`, { headers: headers(pat) });
  if (!res.ok) return null;
  const gists = await res.json();
  const found = gists.find(g => g.description === GIST_DESC && g.files?.[GIST_FILE]);
  return found?.id ?? null;
}

export async function fetchGist(pat, gistId) {
  const res = await fetch(`${GH_API}/gists/${gistId}`, { headers: headers(pat) });
  if (res.status === 404) throw new GistApiError(404, 'Sync gist not found — re-link in Settings');
  await checkResponse(res);
  const data = await res.json();
  const content = data.files?.[GIST_FILE]?.content;
  if (!content) throw new GistApiError(0, 'Sync file missing from gist');
  return JSON.parse(content);
}

export async function createGist(pat, payload) {
  const res = await fetch(`${GH_API}/gists`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(payload, null, 2) } },
    }),
  });
  await checkResponse(res);
  const data = await res.json();
  return data.id;
}

export async function updateGist(pat, gistId, payload) {
  const res = await fetch(`${GH_API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(pat),
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(payload, null, 2) } },
    }),
  });
  await checkResponse(res);
}
