import React, { useState } from 'react';
import { WA_AVATAR } from '../whatsapp/whatsappChatTheme';

export function socialContactInitials(displayName: string): string {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

type Props = {
  displayName: string;
  profilePicUrl?: string | null;
  className?: string;
};

/** Meta CDN profile photo with initials fallback (Omni-Channel Inbox). */
export function SocialContactAvatar({ displayName, profilePicUrl, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = (profilePicUrl || '').trim();
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
