export function getFaviconUrl(source) {
  const base = source?.htmlUrl || source?.xmlUrl;
  if (!base) return null;
  try {
    const { origin } = new URL(base);
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}
