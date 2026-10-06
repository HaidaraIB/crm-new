import React from 'react';
import { InstagramIcon, MessengerIcon } from '../index';

export const InboxChannelBadge: React.FC<{ channel: string; className?: string }> = ({
  channel,
  className,
}) => {
  if (channel === 'whatsapp') return null;
  const Icon = channel === 'instagram' ? InstagramIcon : MessengerIcon;
  return <Icon className={className ?? 'w-3.5 h-3.5'} />;
};

export function blobMediaKind(
  kind: string | null
): 'image' | 'video' | 'audio' | 'document' | null {
  if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'document') {
    return kind;
  }
  return null;
}
