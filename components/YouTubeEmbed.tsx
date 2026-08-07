import React from 'react';

type YouTubeEmbedProps = {
  /** Ready-to-use embed URL from the API, or a raw watch/share URL. */
  embedUrl?: string | null;
  url?: string | null;
  title?: string;
  className?: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Convert common YouTube URL shapes to an embeddable iframe src. */
export function toYouTubeEmbedUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (/youtube\.com\/embed\//i.test(value)) return value;

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';

    if (host === 'youtu.be') {
      id = parsed.pathname.replace(/^\//, '').split('/')[0] || '';
    } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') {
        id = parts[1] || '';
      } else {
        id = parsed.searchParams.get('v') || '';
      }
    }

    if (VIDEO_ID_RE.test(id)) {
      return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  embedUrl,
  url,
  title = 'YouTube video',
  className = '',
}) => {
  const src = embedUrl || toYouTubeEmbedUrl(url);
  if (!src) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 aspect-video bg-black ${className}`}
    >
      <iframe
        title={title}
        src={src}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};
