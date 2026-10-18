import React from 'react';
import { InstagramIcon, MessengerIcon } from '../index';
import { IntegrationPlatformIcon } from '../integrations/IntegrationPlatformIcon';

export const InboxChannelBadge: React.FC<{ channel: string; className?: string }> = ({
  channel,
  className,
}) => {
  const cn = className ?? 'w-3.5 h-3.5';
  if (channel === 'whatsapp') {
    return <IntegrationPlatformIcon platform="whatsapp" size="sm" variant="inline" className={cn} />;
  }
  if (channel === 'instagram') return <InstagramIcon className={cn} />;
  if (channel === 'messenger') return <MessengerIcon className={cn} />;
  return null;
};

export function blobMediaKind(
  kind: string | null
): 'image' | 'video' | 'audio' | 'document' | null {
  if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'document') {
    return kind;
  }
  return null;
}
