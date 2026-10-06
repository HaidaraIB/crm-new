import React, { useState } from 'react';
import { BASE_URL } from '../../services/api';
import { WA_AVATAR } from '../whatsapp/whatsappChatTheme';

export function socialContactInitials(displayName: string): string {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  // Drop trailing "· abcd" disambiguator from fallback labels.
  const cleaned = parts.filter((p) => !p.startsWith('·') && !/^\d{2,4}$/.test(p));
  const use = cleaned.length ? cleaned : parts;
  return use.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

/** Relative /media/... from Django must hit the API host, not Vite. */
function resolveProfilePicUrl(raw: string | null | undefined): string {
  const url = (raw || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  try {
    return `${new URL(BASE_URL).origin}${url}`;
  } catch {
    return url;
  }
}

type Props = {
  displayName: string;
  profilePicUrl?: string | null;
  avatarUrl?: string | null;
  className?: string;
};

/** Meta profile photo with initials fallback (Omni-Channel Inbox). */
export function SocialContactAvatar({ displayName, profilePicUrl, avatarUrl, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = resolveProfilePicUrl(avatarUrl || profilePicUrl);
  const shell = className || WA_AVATAR;
  const initials = socialContactInitials(displayName);

  if (url && !imgFailed) {
    return (
      <img
        src={url}
        alt=""
        className={`${shell} object-cover p-0`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <div className={shell}>{initials}</div>;
}
