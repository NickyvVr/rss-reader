import { toast } from './Toast';
import { buildLinkedInMessage, buildLinkedInShareUrl, buildTwitterUrl, buildTeamsMessage } from '../utils/shareHelpers';

export function ShareButtons({ article, sourceName }) {
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  }

  async function handleLinkedIn() {
    const msg = buildLinkedInMessage(article, sourceName);
    await copyToClipboard(msg);
    window.open(buildLinkedInShareUrl(article.url), '_blank', 'noopener,noreferrer');
    toast('LinkedIn message copied — paste it into your post!');
  }

  function handleTwitter() {
    window.open(buildTwitterUrl(article, sourceName), '_blank', 'noopener,noreferrer');
  }

  async function handleTeams() {
    const msg = buildTeamsMessage(article, sourceName);
    await copyToClipboard(msg);
    toast('Copied for Teams!');
  }

  const btnClass = "flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors";

  return (
    <div className="flex items-center gap-1">
      <button onClick={handleLinkedIn} className={btnClass} title="Share on LinkedIn">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        LinkedIn
      </button>

      <button onClick={handleTwitter} className={btnClass} title="Share on X">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X
      </button>

      <button onClick={handleTeams} className={btnClass} title="Share on Teams">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.103 0-2 .897-2 2v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm-9 9H7V9h4v2zm6 0h-4V9h4v2z"/>
        </svg>
        Teams
      </button>
    </div>
  );
}
