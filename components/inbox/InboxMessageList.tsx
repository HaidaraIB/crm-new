import React from 'react';
import { ChatBlobMedia } from '../chat/ChatBlobMedia';
import { InstagramIcon, MapPinIcon, MessengerIcon } from '../index';
import type { translations } from '../../constants';
import { getSocialMessageAttachmentUrl, type SocialMessagePayload } from '../../services/api';
import { clientLocationMapsUrl } from '../../utils/leadLocation';

type TFn = (key: keyof typeof translations.en) => string;

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

export const InboxMessageAttachment: React.FC<{
  message: SocialMessagePayload;
  t: TFn;
  onOpenMedia?: (messageId: number) => void;
}> = ({ message, t, onOpenMedia }) => {
  const outbound = message.direction === 'outbound';
  const lat = message.location_latitude != null ? Number(message.location_latitude) : null;
  const lng = message.location_longitude != null ? Number(message.location_longitude) : null;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const mapsUrl = hasCoords ? clientLocationMapsUrl(`${lat},${lng}`) : null;

  const expiredLabel =
    !message.has_attachment && message.attachment_kind
      ? message.attachment_kind === 'story_mention'
        ? t('storyMention')
        : message.attachment_kind === 'share'
          ? t('sharedPost')
          : message.attachment_kind === 'reel'
            ? t('sharedReel')
            : null
      : null;

  const mediaKind = message.has_attachment ? blobMediaKind(message.attachment_kind) : null;
  const url = mediaKind ? getSocialMessageAttachmentUrl(message.id) : null;

  return (
    <>
      {hasCoords ? (
        <div className="mb-1 w-[min(70vw,16rem)] max-w-full">
          <div
            className={`flex gap-2 rounded-md px-2.5 py-2 ${
              outbound ? 'bg-black/10' : 'bg-black/[0.04] dark:bg-white/5'
            }`}
          >
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                outbound
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              <MapPinIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium [unicode-bidi:plaintext]" dir="auto">
                {(message.location_name || '').trim() ||
                  (message.location_address || '').trim() ||
                  t('openInMaps')}
              </p>
              {hasCoords ? (
                <p
                  className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                    outbound ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  dir="ltr"
                >
                  {lat!.toFixed(5)}, {lng!.toFixed(5)}
                </p>
              ) : null}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-block text-xs font-medium ${
                    outbound ? 'text-white/90 hover:text-white' : 'text-primary hover:underline'
                  }`}
                >
                  {t('openInMaps')}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {expiredLabel ? <div className="text-xs italic opacity-80">{expiredLabel}</div> : null}

      {mediaKind && url ? (
        <div
          className={
            mediaKind === 'audio'
              ? 'mb-1 w-full min-w-0'
              : mediaKind === 'document'
                ? 'mb-1 w-[min(70vw,16rem)] max-w-full'
                : 'mb-1 w-[min(70vw,20rem)] max-w-full'
          }
        >
          <ChatBlobMedia
            url={url}
            kind={mediaKind}
            mine={outbound}
            filename={message.original_filename}
            attachmentWidth={message.attachment_width}
            attachmentHeight={message.attachment_height}
            t={t as any}
            onOpen={
              onOpenMedia && (mediaKind === 'image' || mediaKind === 'video')
                ? () => onOpenMedia(message.id)
                : undefined
            }
          />
        </div>
      ) : null}
    </>
  );
};
