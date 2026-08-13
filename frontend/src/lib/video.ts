export type VideoEmbed = { kind: 'youtube' | 'vimeo' | 'file'; src: string };

const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

// Accepts "436", "436s", "7m16s", "1h2m3s" — the handful of ways YouTube
// itself writes a `t=`/`start=` timestamp across its own URL formats.
function parseTimestampSeconds(raw: string): number | undefined {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined;
  const [, h, m, s] = match;
  return (parseInt(h ?? '0', 10) * 3600) + (parseInt(m ?? '0', 10) * 60) + parseInt(s ?? '0', 10);
}

function extractYoutubeId(u: URL): string | null {
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const segments = u.pathname.split('/').filter(Boolean);

  let id: string | null = null;
  if (host === 'youtu.be') {
    id = segments[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v');
    } else if ((segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live') && segments[1]) {
      id = segments[1];
    }
  }

  return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
}

function extractVimeoId(u: URL): string | null {
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const id = u.pathname.split('/').filter(Boolean).find((seg) => /^\d+$/.test(seg));
  return id ?? null;
}

// Parses a video URL properly (hostname + path + query params) rather than
// matching one rigid string pattern — so any harmless extra YouTube query
// param (&t=, &list=, &si=, etc.) is tolerated instead of causing a reject.
export function getVideoEmbed(url: string): VideoEmbed | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    // Admins sometimes paste a link without the protocol, e.g.
    // "youtu.be/xyz" — retry once assuming https before giving up.
    try {
      u = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  const youtubeId = extractYoutubeId(u);
  if (youtubeId) {
    const rawTimestamp = u.searchParams.get('t') ?? u.searchParams.get('start');
    const start = rawTimestamp ? parseTimestampSeconds(rawTimestamp) : undefined;
    const src = `https://www.youtube.com/embed/${youtubeId}${start ? `?start=${start}` : ''}`;
    return { kind: 'youtube', src };
  }

  const vimeoId = extractVimeoId(u);
  if (vimeoId) {
    return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeoId}` };
  }

  if (/\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) {
    return { kind: 'file', src: trimmed };
  }

  return null;
}
